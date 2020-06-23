/* eslint-disable import/prefer-default-export */
export function getExplorerLink(url) {
  return `${window.env.chainHost.replace(/\/api$/, '')}/node/explorer${url}`;
}
