export const FILE_EDIT_PROMPT = `# File Editing Guidelines
- Performs exact string replacements in existing files
- old_string must match exactly, including whitespace and indentation
- The edit will fail if old_string is not unique (use replace_all for multiple matches)
- Use replace_all to replace every occurrence of old_string
- Use dry_run to preview changes without applying them
- Prefer editing existing files over creating new ones
- Always use absolute file paths
- Match the exact indentation (tabs/spaces) from the file
- Do not remove content not related to your change`;
