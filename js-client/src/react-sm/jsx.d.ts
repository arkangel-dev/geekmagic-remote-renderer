// With the automatic JSX runtime, TS resolves IntrinsicElements from react/jsx-runtime's
// JSX namespace (which re-exports React's), not a bare global `JSX` namespace.
declare module 'react/jsx-runtime' {
	namespace JSX {
		interface IntrinsicElements {
			baseBox: Record<string, unknown>;
			ditherBox: Record<string, unknown>;
			baseText: Record<string, unknown>;
			fontText: Record<string, unknown>;
		}
	}
}
