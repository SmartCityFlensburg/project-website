export function setCookie(cookieName: string) {
    const date = new Date();
    const cookieLifetimeInDays = 182;
    const cookieDomain = window.location.hostname;

    date.setTime(date.getTime() + (cookieLifetimeInDays * 24 * 60 * 60 * 1000));

    const cookie = cookieName + '=' + true
        + ';expires=' + date.toUTCString()
        + ';domain=' + cookieDomain
        + ';path=/'
        + ';samesite=' + 'lax';


    document.cookie = cookie;
}

export function hasCookie(cookieName: string): boolean {
    const name = cookieName + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieItems = decodedCookie.split(';');

    for (let i = 0; i < cookieItems.length; i++) {
        const cookie = cookieItems[i].trim();

        if (cookie.indexOf(name) === 0) {
            return true;
        }
    }

    return false;
}
