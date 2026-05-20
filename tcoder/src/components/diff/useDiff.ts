import { useMemo } from 'react';
import { diffLines, type Change } from 'diff';

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  lineNumber: {
    old: number | null;
    new: number | null;
  };
}

export function useDiff(
  oldText: string,
  newText: string,
  contextLines: number = 3,
): DiffLine[] {
  return useMemo(() => {
    const changes: Change[] = diffLines(oldText, newText);
    const result: DiffLine[] = [];

    let oldLine = 1;
    let newLine = 1;

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      const lines = change.value.split('\n');
      // Remove trailing empty line from split
      if (lines[lines.length - 1] === '') lines.pop();

      if (change.added) {
        for (const line of lines) {
          result.push({
            type: 'add',
            content: line,
            lineNumber: { old: null, new: newLine++ },
          });
        }
      } else if (change.removed) {
        for (const line of lines) {
          result.push({
            type: 'remove',
            content: line,
            lineNumber: { old: oldLine++, new: null },
          });
        }
      } else {
        // Context lines
        const totalContext = lines.length;
        const showAll = totalContext <= contextLines * 2 + 2;

        for (let j = 0; j < lines.length; j++) {
          const isNearChange =
            showAll ||
            j < contextLines ||
            j >= lines.length - contextLines;

          if (isNearChange) {
            result.push({
              type: 'context',
              content: lines[j],
              lineNumber: { old: oldLine, new: newLine },
            });
          }
          oldLine++;
          newLine++;
        }
      }
    }

    return result;
  }, [oldText, newText, contextLines]);
}
