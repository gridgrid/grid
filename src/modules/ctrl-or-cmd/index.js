module.exports = function (e) {
    return (window.navigator.userAgent.match(/win/i) ? e.ctrlKey : e.metaKey)
};