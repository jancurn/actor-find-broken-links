const parseUrl = str => {
    if (typeof str !== 'string') {
        return {};
    }

    const o = {
        strictMode: false,
        key: ['source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment'],
        q: {
            name: 'queryKey',
            parser: /(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser: {
            strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            // eslint-disable-line max-len,no-useless-escape
            loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // eslint-disable-line max-len,no-useless-escape

        }
    };
    const m = o.parser[o.strictMode ? 'strict' : 'loose'].exec(str); // eslint-disable-line no-shadow

    const uri = {};
    let i = o.key.length;

    while (i--) uri[o.key[i]] = m[i] || '';

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, ($0, $1, $2) => {
        if ($1) uri[o.q.name][$1] = $2;
    }); // our extension - parse fragment using a query string format (i.e. "#key1=val1&key2=val2")
    // this format is used by many websites

    uri.fragmentKey = {};

    if (uri.fragment) {
        uri.fragment.replace(o.q.parser, ($0, $1, $2) => {
            if ($1) uri.fragmentKey[$1] = $2;
        });
    }

    return uri;
};

const normalizeUrl = (url, keepFragment) => {
    if (typeof url !== 'string' || !url.length) {
        return null;
    }

    const urlObj = parseUrl(url.trim());

    if (!urlObj.protocol || !urlObj.host) {
        return null;
    }

    const path = urlObj.path.replace(/\/$/, '');
    const params = urlObj.query ? urlObj.query.split('&').filter(param => {
        return !/^utm_/.test(param);
    }).sort() : [];
    return `${urlObj.protocol.trim().toLowerCase()}://${urlObj.host.trim().toLowerCase()}${path.trim()}${params.length ? `?${params.join('&').trim()}` : ''}${keepFragment && urlObj.fragment ? `#${urlObj.fragment.trim()}` : ''}`;
};

export default {
    normalizeUrl
}