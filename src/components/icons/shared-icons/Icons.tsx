import { createElement } from 'react';
import type { SVGProps } from 'react';
import { iconData } from './icon-data';

// Vendored outline glyphs: Lucide. Retain vendor/LUCIDE-LICENSE.txt when copying.
const uiNames = {
  learn: 'route', practice: 'target', leaderboard: 'trophy', profile: 'user-round',
  friends: 'users-round', settings: 'settings-2', shop: 'shopping-bag', close: 'x',
  back: 'arrow-left', next: 'arrow-right', menu: 'menu', listen: 'volume-2',
  mute: 'volume-x', record: 'mic', report: 'flag', correct: 'circle-check',
  incorrect: 'circle-x', locked: 'lock-keyhole', english: 'book-open',
  python: 'terminal', code: 'code-xml', debug: 'bug', play: 'play', pause: 'pause',
  search: 'search', expand: 'chevron-down', forward: 'chevron-right', help: 'help-circle',
  logout: 'log-out', check: 'check', add: 'plus', remove: 'minus', loading: 'loader-circle',
} as const;
export type IconName = keyof typeof uiNames;
export type GameIconName = 'treats' | 'streak' | 'energy' | 'xp' | 'shield' | 'badge';
type Props = Omit<SVGProps<SVGSVGElement>, 'children' | 'name' | 'aria-label' | 'aria-hidden' | 'role' | 'dangerouslySetInnerHTML'> & {
  size?: 20 | 24 | 28 | 32 | 48 | 64;
  /** Omit when adjacent text or the parent button already supplies the accessible name. */
  label?: string;
};
type Node = readonly [string, Readonly<Record<string, string>>, readonly Node[]];
function renderNode([tag, attrs, children]: Node, key: number): ReturnType<typeof createElement> {
  return createElement(tag, { ...attrs, key }, ...children.map(renderNode));
}
function Glyph({ asset, size = 24, label, style, ...props }: Props & { asset: keyof typeof iconData }) {
  const data = iconData[asset];
  return createElement('svg', {
    ...data.attrs, ...props, xmlns: 'http://www.w3.org/2000/svg', viewBox: data.viewBox,
    width: size, height: size, focusable: 'false',
    role: label ? 'img' : undefined, 'aria-label': label, 'aria-hidden': label ? undefined : true,
    style: { display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style },
  }, ...data.nodes.map((node, key) => renderNode(node as Node, key)));
}
export function Icon({ name, ...props }: Props & { name: IconName }) {
  return <Glyph {...props} asset={`ui/${uiNames[name]}`} />;
}
export function GameIcon({ name, ...props }: Props & { name: GameIconName }) {
  return <Glyph {...props} asset={`game/${name}`} />;
}
