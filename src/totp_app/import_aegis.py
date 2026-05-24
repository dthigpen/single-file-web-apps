import argparse
import json
import base64
import getpass
from pathlib import Path
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

# --- CONFIGURATION ---
DEFAULT_INPUT_FILE = "aegis_backup.json"

def decrypt_aegis_vault(file_path, password_bytes):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    header = data["header"]
    
    # 1. Extract the user password scrypt parameters
    slot = [s for s in header["slots"] if s["type"] == 1][0]
    kdf = Scrypt(
        salt=bytes.fromhex(slot["salt"]),
        length=32,
        n=slot["n"],
        r=slot["r"],
        p=slot["p"]
    )
    derived_user_key = kdf.derive(password_bytes)

    # 2. Decrypt the underlying master key
    cipher_master = AESGCM(derived_user_key)
    key_params = slot["key_params"]
    master_key = cipher_master.decrypt(
        nonce=bytes.fromhex(key_params["nonce"]),
        data=bytes.fromhex(slot["key"]) + bytes.fromhex(key_params["tag"]),
        associated_data=None
    )

    # 3. Decrypt the actual tokens database payload
    db_content = base64.b64decode(data["db"])
    db_params = header["params"]
    cipher_db = AESGCM(master_key)

    raw_vault_bytes = cipher_db.decrypt(
        nonce=bytes.fromhex(db_params["nonce"]),
        data=db_content + bytes.fromhex(db_params["tag"]),
        associated_data=None
    )
    
    return json.loads(raw_vault_bytes.decode("utf-8"))

def transform_to_vault_format(aegis_db):
    entries = aegis_db.get("entries", [])
    parsed_entries = []
    
    for entry in entries:
        issuer = entry.get("issuer", "").strip()
        name = entry.get("name", "").strip()
        
        if issuer and name and issuer.lower() != name.lower():
            label = f"{issuer}: {name}"
        else:
            label = issuer or name or "Unknown Account"

        info = entry.get("info", {})
        secret = info.get("secret", "").strip()
        period = info.get("period", 30)

        if not secret:
            continue

        clean_secret = secret.replace(" ", "").replace("-", "").upper()
        parsed_entries.append({
            "label": label,
            "secret": clean_secret,
            "period": period
        })
        
    return parsed_entries

def encrypt_for_web_vault(parsed_data, web_passphrase):
    # This precisely mimics the JS: pbkdf2 derivation, 16-byte salt, 12-byte iv, aes-gcm
    plain_text_bytes = json.dumps(parsed_data).encode("utf-8")
    
    salt = os.urandom(16)
    iv = os.urandom(12)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000
    )
    derived_web_key = kdf.derive(web_passphrase.encode("utf-8"))
    
    aes_gcm = AESGCM(derived_web_key)
    ciphertext = aes_gcm.encrypt(iv, plain_text_bytes, None)
    
    # Package into a unified payload format: [salt (16)][iv (12)][ciphertext + tag]
    combined = bytearray()
    combined.extend(salt)
    combined.extend(iv)
    combined.extend(ciphertext)
    
    return base64.b64encode(combined).decode("utf-8")

def existing_file(p: str) -> Path:
    p: Path = Path(p)
    if not p.is_file():
        raise argparse.ArgumentTypeError(f'Aegis backup file path is not a file: {p}')
    return p

def parse_args():
    parser = argparse.ArgumentParser(description='A tool to convert an encrypted Aegis backup into an encrypted totp_app TOTP list')
    parser.add_argument('input_enc_aegis_path', type=existing_file, help='Path to an (encypted) Aegis JSON backup file with TOTP codes')
    parser.add_argument('-o', '--out-file', type=Path, help='Output path to write out the totp_app (encrypted) TOTP list. Otherwise output to stdout')
    parser.add_argument('-s', '--same-password', action='store_true', help='Use the same password for the totp_app encrypted data as was used to decrypt the Aegis backup')
    return parser.parse_args()

def main():
    args = parse_args()
    input_file = args.input_enc_aegis_path
    output_file = args.out_file
    # Securely hide pass inputs on terminal stdin
    aegis_pass = getpass.getpass("Enter Aegis Vault Backup Password: ")
    if args.same_password:
        web_pass = aegis_pass
    else:
        valid = False
        while not valid:
            web_pass = getpass.getpass("Create a Master Passphrase for Web Vault: ")
            web_pass_confirm = getpass.getpass("Enter again: ")
            valid = web_pass == web_pass_confirm
            if not valid:
                print('Passwords do not match, try again.')
        
    
    try:
        print("\nDecrypting Aegis archive in memory...")
        aegis_db = decrypt_aegis_vault(input_file, aegis_pass.encode("utf-8"))
        
        print("Transforming credentials database format...")
        parsed_data = transform_to_vault_format(aegis_db)
        
        print("Compiling and sealing using AES-GCM-256 web format...")
        encrypted_output_block = encrypt_for_web_vault(parsed_data, web_pass)
        
        print("\nMigration Successful!")
        if output_file:
            output_file.write_text(encrypted_output_block)
            print(f"Data written to {output_file}")
        else:
            print("Copy the entire string block below and paste it into 'Direct Import' or your web app config:")
            print("-" * 64)
            print(encrypted_output_block)
            print("-" * 64)
            
    except Exception as e:
        print(f"\nExecution Failed. Verify your password credentials. Details: {str(e)}")

if __name__ == "__main__":
    main()