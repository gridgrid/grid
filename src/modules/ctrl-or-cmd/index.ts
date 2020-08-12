export default function (e: { ctrlKey: boolean; metaKey: boolean }) {
  return (
    (window.navigator.userAgent.match(/win/i) ? e.ctrlKey : e.metaKey) || false
  );
}

