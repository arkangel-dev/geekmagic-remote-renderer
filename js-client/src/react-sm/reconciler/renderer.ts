import React from 'react';
import Reconciler from 'react-reconciler';
import type { HostRoot } from '../node-interfaces.js';
import { hostConfig } from './host-config.js';


const reconciler = Reconciler(hostConfig);

// Wraps a plain host root object in a reconciler container and returns render/unmount handles.
export function createRoot(container: HostRoot, onCommit?: () => void) {
	if (onCommit) {
		container.onCommit = onCommit;
	}

	const root = reconciler.createContainer(
		container,
		0,
		null,
		false,
		null,
		'',
		console.error,
		console.error,
		console.error,
		() => {},
	);

	return {
		// Commits the element tree into `container` synchronously (sync APIs are used since
		// this runs as a one-shot Node script, not inside a browser event loop).
		render(element: React.ReactNode) {
			reconciler.updateContainerSync(
				element,
				root,
				null,
				null,
			);
			reconciler.flushSyncWork();
		},

		// Tears down the tree by committing a null element.
		unmount() {
			reconciler.updateContainerSync(
				null,
				root,
				null,
				null,
			);
			reconciler.flushSyncWork();
		},
	};
}