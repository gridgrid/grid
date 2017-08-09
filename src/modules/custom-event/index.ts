export default function (name: string, bubbles: boolean, cancelable: boolean = false, detail?: any) {
    const event = document.createEvent('CustomEvent');  // MUST be 'CustomEvent'
    event.initCustomEvent(name, bubbles, cancelable, detail);
    return event;
}