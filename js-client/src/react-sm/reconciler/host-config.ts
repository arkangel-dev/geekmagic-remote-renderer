import type Reconciler from "react-reconciler";
import type {
	HostNode,
	HostRawText,
	HostRoot,
	InternalNodeName,
} from "../node-interfaces.js";
import {
	AppendChild,
	AppendChildToContainer,
	CreateYogaNode,
	hasStyleChanged,
	InsertBeforeNode,
	InsertInContainerBefore,
	markDirty,
	markParentDirty,
	RemoveChild,
	RemoveChildFromContainer,
	updateTextMeasure,
} from "./reconciler-callbacks.js";
import Yoga from "yoga-layout";
import {
	DefaultEventPriority,
	NoEventPriority,
} from "react-reconciler/constants.js";
import { v4 } from "uuid";

export type HostConfig = Reconciler.HostConfig<
	InternalNodeName,
	Record<string, unknown>,
	HostRoot,
	HostNode,
	HostRawText,
	never,
	never,
	never,
	HostNode | HostRawText,
	Record<string, unknown>,
	never,
	ReturnType<typeof setTimeout>,
	-1,
	number
>;

let currentUpdatePriority: number = NoEventPriority;

export const hostConfig: HostConfig = {
	supportsMutation: true,
	supportsPersistence: false,
	supportsHydration: false,
	isPrimaryRenderer: false,
	NotPendingTransition: null,
	HostTransitionContext: null as never,
	noTimeout: -1,
	supportsMicrotasks: true,

	createInstance(type, props, rootContainer): HostNode {
		const [styles, updatedYogaNode] = CreateYogaNode(props);

		return {
			id: v4(),
			type,
			props,
			children: [],
			root: rootContainer,
			yogaNode: updatedYogaNode,
			style: styles,
		};
	},
	createTextInstance(text, rootContainer): HostRawText {
		var result: HostRawText = {
			id: v4(),
			type: "rawtext",
			text,
			root: rootContainer,
			yogaNode: Yoga.Node.create(),
		};
		return result;
	},
	appendInitialChild: AppendChild,
	finalizeInitialChildren: () => false,
	shouldSetTextContent: (_: InternalNodeName) => false,
	getRootHostContext: () => ({}),
	getChildHostContext: (parentHostContext) => parentHostContext,
	getPublicInstance: (instance) => instance,
	prepareForCommit: () => null,
	resetAfterCommit: (container) => container.onCommit?.(),
	preparePortalMount() {},
	scheduleTimeout: (fn, delay) => setTimeout(fn, delay),
	cancelTimeout: (id) => clearTimeout(id),
	scheduleMicrotask: (fn) => queueMicrotask(fn),
	getInstanceFromNode: () => null,
	beforeActiveInstanceBlur() {},
	afterActiveInstanceBlur() {},
	prepareScopeUpdate() {},
	getInstanceFromScope: () => null,
	detachDeletedInstance() {},
	appendChild: AppendChild,
	appendChildToContainer: AppendChildToContainer,
	insertBefore: InsertBeforeNode,
	insertInContainerBefore: InsertInContainerBefore,
	removeChild: RemoveChild,
	removeChildFromContainer: RemoveChildFromContainer,
	resetTextContent() {},
	commitTextUpdate(textInstance, oldText, newText) {
		textInstance.previousText = oldText;
		textInstance.text = newText;
		if (textInstance.parentNode) updateTextMeasure(textInstance.parentNode);
		markParentDirty(textInstance);
	},
	commitMount() {},
	commitUpdate(instance, type, previousProps, nextProps) {
		instance.props = nextProps;

		const [newStyles, updatedYogaNode] = CreateYogaNode(nextProps);
		const stylesChanged =
			JSON.stringify(instance.style ?? {}) !== JSON.stringify(newStyles ?? {});
		if (!stylesChanged) {
			updatedYogaNode.free();
			return;
		}

		instance.yogaNode?.copyStyle(updatedYogaNode);
		instance.style = newStyles;
		updatedYogaNode.free();
		updateTextMeasure(instance);
		markDirty(instance);
	},
	hideInstance(instance) {
		instance.yogaNode?.setDisplay(Yoga.DISPLAY_NONE);
		markDirty(instance);
	},
	hideTextInstance() {},
	unhideInstance(instance) {
		instance.yogaNode?.setDisplay(Yoga.DISPLAY_FLEX);
		markDirty(instance);
	},
	unhideTextInstance() {},
	clearContainer(container) {
		container.children.length = 0;
		container.dirtyNodes?.clear();
		return false;
	},
	setCurrentUpdatePriority: (newPriority) => {
		currentUpdatePriority = newPriority;
	},
	getCurrentUpdatePriority: () => currentUpdatePriority,
	resolveUpdatePriority: () => currentUpdatePriority || DefaultEventPriority,
	resetFormInstance() {},
	requestPostPaintCallback: (callback) =>
		queueMicrotask(() => callback(Date.now())),
	shouldAttemptEagerTransition: () => false,
	trackSchedulerEvent() {},
	resolveEventType: () => null,
	resolveEventTimeStamp: () => Date.now(),
	maySuspendCommit: () => false,
	preloadInstance: () => true,
	startSuspendingCommit() {},
	suspendInstance() {},
	waitForCommitToBeReady: () => null,
};
