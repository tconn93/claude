import React, { type ReactElement } from 'react';
import { Box } from './Box.tsx';
import { Text } from './Text.tsx';
import { Flex } from './Flex.tsx';

export interface ConfirmDialogProps {
  message: string;
  detail?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog(props: ConfirmDialogProps): ReactElement {
  const {
    message,
    detail,
    onConfirm,
    onCancel,
    confirmLabel = 'Yes',
    cancelLabel = 'No',
  } = props;

  return React.createElement(
    Box,
    { border: 'single', padding: 1 },
    React.createElement(Flex, { flexDirection: 'column', gap: 1 },
      React.createElement(Text, { bold: true, color: '#eab308' }, `? ${message}`),
      detail ? React.createElement(Text, { dim: true }, detail) : null,
      React.createElement(Flex, { flexDirection: 'row', gap: 2 },
        React.createElement(Text, { bold: true, color: '#22c55e' }, `[Y] ${confirmLabel}`),
        React.createElement(Text, { bold: true, color: '#ef4444' }, `[N] ${cancelLabel}`),
      ),
    ),
  );
}
