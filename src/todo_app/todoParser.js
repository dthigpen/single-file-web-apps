/**
 * Fast, lightweight todo.txt format parser & serializer
 * Specification: https://github.com/todotxt/todo.txt
 */

const PRIORITY_REGEX = /^\(([A-Z])\)\s+/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PROJECT_REGEX = /(?:^|\s)\+([^\s]+)/g;
const CONTEXT_REGEX = /(?:^|\s)@([^\s]+)/g;
const KEY_VALUE_REGEX = /(?:^|\s)([a-zA-Z0-9_-]+):([^\s]+)/g;

/**
 * Parses a single raw string line into a structured Todo object
 */
export function parseTodoLine(raw, id = crypto.randomUUID()) {
    const trimmed = raw.trim();
    if (!trimmed) {
        return { id, raw, isEmpty: true };
    }

    let working = trimmed;
    let completed = false;
    let completionDate = null;
    let priority = null;
    let creationDate = null;

    // 1. Completion check
    if (working.startsWith('x ')) {
        completed = true;
        working = working.slice(2).trim();

        // Optional completion date
        const parts = working.split(/\s+/);
        if (parts[0] && DATE_REGEX.test(parts[0])) {
            completionDate = parts[0];
            working = parts.slice(1).join(' ');
        }
    }

    // 2. Priority check (A-Z)
    const prioMatch = working.match(PRIORITY_REGEX);
    if (prioMatch) {
        priority = prioMatch[1];
        working = working.replace(PRIORITY_REGEX, '');
    }

    // 3. Creation date check
    const dateParts = working.split(/\s+/);
    if (dateParts[0] && DATE_REGEX.test(dateParts[0])) {
        creationDate = dateParts[0];
        working = dateParts.slice(1).join(' ');
    }

    // 4. Extract Projects (+project)
    const projects = [];
    let match;
    const projRegex = new RegExp(PROJECT_REGEX);
    while ((match = projRegex.exec(working)) !== null) {
        projects.push(match[1]);
    }

    // 5. Extract Contexts (@context)
    const contexts = [];
    const ctxRegex = new RegExp(CONTEXT_REGEX);
    while ((match = ctxRegex.exec(working)) !== null) {
        contexts.push(match[1]);
    }

    // 6. Extract Key:Value metadata
    const metadata = {};
    const kvRegex = new RegExp(KEY_VALUE_REGEX);
    while ((match = kvRegex.exec(working)) !== null) {
        const key = match[1];
        const val = match[2];
        // Ignore +project and @context captured accidentally
        if (!key.startsWith('+') && !key.startsWith('@')) {
            metadata[key] = val;
        }
    }

    return {
        id,
        raw,
        completed,
        completionDate,
        priority,
        creationDate,
        description: working,
        projects: [...new Set(projects)],
        contexts: [...new Set(contexts)],
        metadata,
        isEmpty: false
    };
}

/**
 * Serializes a Todo item back into a single todo.txt format string
 */
export function serializeTodoItem(item) {
    if (item.isEmpty) return item.raw || '';

    const tokens = [];

    if (item.completed) {
        tokens.push('x');
        if (item.completionDate) {
            tokens.push(item.completionDate);
        }
    }

    if (item.priority) {
        tokens.push(`(${item.priority})`);
    }

    if (item.creationDate) {
        tokens.push(item.creationDate);
    }

    tokens.push(item.description);

    return tokens.join(' ');
}

/**
 * Parses full file text into structured items
 */
export function parseTodoText(text) {
    const lines = text.split(/\r?\n/);
    return lines.map((line, idx) => parseTodoLine(line, `line-${idx}`));
}

/**
 * Serializes item list back into string payload
 */
export function serializeTodoList(items) {
    return items.map((item) => serializeTodoItem(item)).join('\n');
}