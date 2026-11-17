import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Strip all HTML and dangerous URI schemes; sanitize-html is the final safety
// net. (It is a pure-JS parser: unlike DOMPurify on the server it needs no
// jsdom, whose ESM-only dependencies fail to load in Vercel functions.)
marked.use({
	renderer: {
		html() {
			return '';
		}
	}
});

const ALLOWED_TAGS = [
	'p',
	'br',
	'strong',
	'em',
	'del',
	's',
	'code',
	'pre',
	'blockquote',
	'ul',
	'ol',
	'li',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'a'
];

// Strip markdown syntax characters for compact, single-line previews.
export function stripMarkdown(text: string): string {
	return text.replace(/[#*_`~>[\]]/g, '').trim();
}

export function renderMarkdown(text: string): string {
	// `breaks: true` turns single newlines into <br> so users' line breaks in
	// journal/notes show up as written (CommonMark would otherwise collapse them).
	const raw = marked.parse(text, { async: false, gfm: true, breaks: true }) as string;
	return sanitizeHtml(raw, {
		allowedTags: ALLOWED_TAGS,
		allowedAttributes: { a: ['href', 'rel'] },
		// Anything else (javascript:, data:, vbscript:…) loses its href.
		allowedSchemes: ['http', 'https', 'mailto', 'tel'],
		allowProtocolRelative: false,
		// Disallowed tags are dropped but their text is kept, except these,
		// whose content must never surface as text.
		nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe']
	});
}
