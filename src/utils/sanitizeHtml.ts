const allowedHtmlTags = new Set(['strong', 'b', 'em', 'i', 'br', 'span', 'p']);
const allowedHtmlAttrs = new Set(['style']);
const allowedStyleProps = new Set(['font-size', 'color', 'margin-top', 'display', 'border-bottom', 'padding', 'font-weight']);

function sanitizeStyle(styleValue: string): string {
  return styleValue
    .split(';')
    .map(rule => rule.trim())
    .filter(Boolean)
    .map(rule => {
      const [property, ...valueParts] = rule.split(':');
      const prop = property?.trim().toLowerCase();
      const value = valueParts.join(':').trim();
      if (!prop || !allowedStyleProps.has(prop)) return '';
      if (/url\s*\(|expression\s*\(|javascript:/i.test(value)) return '';
      return `${prop}: ${value}`;
    })
    .filter(Boolean)
    .join('; ');
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;

  const walk = (node: Node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (!allowedHtmlTags.has(tag)) {
          el.replaceWith(document.createTextNode(el.textContent || ''));
          return;
        }

        [...el.attributes].forEach(attr => {
          const name = attr.name.toLowerCase();
          if (name.startsWith('on') || !allowedHtmlAttrs.has(name)) {
            el.removeAttribute(attr.name);
            return;
          }
          if (name === 'style') {
            const cleanStyle = sanitizeStyle(attr.value);
            if (cleanStyle) el.setAttribute('style', cleanStyle);
            else el.removeAttribute('style');
          }
        });
      }
      walk(child);
    });
  };

  walk(template.content);
  return template.innerHTML;
}

export function sanitizeSvg(svg: string): string {
  if (!svg) return '';
  const template = document.createElement('template');
  template.innerHTML = svg;
  template.content.querySelectorAll('script, foreignObject, iframe, object, embed').forEach(node => node.remove());
  template.content.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith('on') || /javascript:/i.test(value)) {
        node.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
}
