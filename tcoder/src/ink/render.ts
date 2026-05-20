import ReactReconciler from 'react-reconciler';
import type { ReactElement } from 'react';
import type { TNode, Container, HostContext } from './types.ts';

const NO_CONTEXT: HostContext = {};

function createTextNode(text: string): TNode {
  return {
    type: 'text',
    text,
    children: [],
    props: {},
    styles: [],
  };
}

function createNode(type: string, props: Record<string, unknown>): TNode {
  return {
    type,
    props,
    children: [],
    styles: [],
  };
}

const hostConfig: ReactReconciler.HostConfig<
  string,
  Record<string, unknown>,
  Container,
  TNode,
  TNode,
  TNode,
  unknown,
  HostContext,
  string[],
  number,
  null,
  void
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  noTimeout: -1,

  getRootHostContext(): HostContext {
    return NO_CONTEXT;
  },

  getChildHostContext(parentContext: HostContext): HostContext {
    return parentContext;
  },

  shouldSetTextContent(): boolean {
    return false;
  },

  createTextInstance(
    text: string,
    _rootContainerInstance: Container,
    _hostContext: HostContext,
  ): TNode {
    return createTextNode(text);
  },

  createInstance(
    type: string,
    props: Record<string, unknown>,
    _rootContainerInstance: Container,
    _hostContext: HostContext,
  ): TNode {
    return createNode(type, props);
  },

  appendInitialChild(
    parentInstance: TNode,
    child: TNode,
  ): void {
    parentInstance.children.push(child);
    child.parent = parentInstance;
  },

  finalizeInitialChildren(): boolean {
    return false;
  },

  prepareForCommit(): null {
    return null;
  },

  resetAfterCommit(): void {
    // called after commit
  },

  commitMount(
    _instance: TNode,
    _type: string,
    _newProps: Record<string, unknown>,
  ): void {
    // no-op
  },

  appendChildToContainer(
    container: Container,
    child: TNode,
  ): void {
    container.root = child;
    child.parent = undefined;
  },

  appendChild(
    parentInstance: TNode,
    child: TNode,
  ): void {
    parentInstance.children.push(child);
    child.parent = parentInstance;
  },

  insertBefore(
    parentInstance: TNode,
    child: TNode,
    beforeChild: TNode,
  ): void {
    const idx = parentInstance.children.indexOf(beforeChild);
    if (idx === -1) {
      parentInstance.children.push(child);
    } else {
      parentInstance.children.splice(idx, 0, child);
    }
    child.parent = parentInstance;
  },

  insertInContainerBefore(
    container: Container,
    child: TNode,
    beforeChild: TNode,
  ): void {
    if (container.root) {
      const idx = [container.root].indexOf(beforeChild);
      if (idx === -1) {
        container.root = child;
      }
    } else {
      container.root = child;
    }
  },

  removeChild(
    parentInstance: TNode,
    child: TNode,
  ): void {
    const idx = parentInstance.children.indexOf(child);
    if (idx !== -1) {
      parentInstance.children.splice(idx, 1);
    }
    child.parent = undefined;
  },

  removeChildFromContainer(
    container: Container,
    child: TNode,
  ): void {
    if (container.root === child) {
      container.root = undefined;
    }
  },

  commitTextUpdate(
    textInstance: TNode,
    oldText: string,
    newText: string,
  ): void {
    if (oldText !== newText) {
      textInstance.text = newText;
    }
  },

  commitUpdate(
    instance: TNode,
    updatePayload: string[],
    _type: string,
    _oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ): void {
    instance.props = newProps;
    if (updatePayload) {
      instance.styles = updatePayload;
    }
  },

  prepareUpdate(
    _instance: TNode,
    _type: string,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ): string[] | null {
    const diff: string[] = [];
    for (const key of Object.keys(newProps)) {
      if (oldProps[key] !== newProps[key]) {
        diff.push(`${key}:${String(newProps[key])}`);
      }
    }
    return diff.length > 0 ? diff : null;
  },

  getPublicInstance(instance: TNode): TNode {
    return instance;
  },

  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  clearContainer(container: Container): void {
    container.root = undefined;
  },

  detachDeletedInstance(): void {
    // no-op
  },
};

const reconciler = ReactReconciler(hostConfig);

let currentContainer: Container | null = null;

export function createContainer(): Container {
  return { root: undefined };
}

export function render(element: ReactElement, container: Container): void {
  currentContainer = container;
  const root = container.root;
  if (root) {
    reconciler.updateContainer(element, root, null, () => {});
  } else {
    const newRoot = reconciler.createContainer(
      container,
      0,
      null,
      true,
      null,
      '',
      () => {},
      null,
    );
    reconciler.updateContainer(element, newRoot, null, () => {});
    container.root = newRoot;
  }
}

export function getCurrentTree(): TNode | undefined {
  return currentContainer?.root as unknown as TNode | undefined;
}

export function flush(): void {
  reconciler.flushSync();
}
