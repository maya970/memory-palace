/** 判断手机/平板/桌面，给登录页和触摸键用。不在登录前加载 3D。 */
export function deviceKind() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const touch = navigator.maxTouchPoints > 0;
  const short = Math.min(window.innerWidth, window.innerHeight);
  if (!coarse && !(touch && short < 920)) return 'desk';
  return short < 680 ? 'phone' : 'tablet';
}

export function isHandheld() {
  return deviceKind() !== 'desk';
}

export function markDevice() {
  const kind = deviceKind();
  document.body.classList.toggle('handheld', kind !== 'desk');
  document.body.classList.toggle('phone', kind === 'phone');
  document.body.classList.toggle('tablet', kind === 'tablet');
  return kind;
}
