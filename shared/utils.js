/**
 * Generates a dynamic file download directly in the browser environment.
 * @param {Object} dataObject - The state or configuration object to save.
 * @param {string} filename - The desired target name for the downloaded file.
 */
function exportAppState(dataObject, filename) {
    const jsonString = JSON.stringify(dataObject, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement("a");
    
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Binds an event listener to a file input element to read raw text content.
 * @param {string} inputId - The HTML id string of the target input[type="file"].
 * @param {function} callback - Execution block passing the successfully parsed object.
 */
function initializeAppImporter(inputId, callback) {
    const filePicker = document.getElementById(inputId);
    if (!filePicker) return;

    filePicker.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsedData = JSON.parse(event.target.result);
                callback(parsedData);
            } catch (err) {
                alert("Failed to parse file data: " + err.message);
            }
        };
        reader.readAsText(file);
    });
}