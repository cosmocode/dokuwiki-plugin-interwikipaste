jQuery(function () {
    jQuery('#wiki__text').on('paste', function (event) {

        let isMediaLink = false;

        /**
         * Decodes HTML entities
         *
         * @param input
         * @returns {string}
         */
        function htmlDecode(input) {
            const doc = new DOMParser().parseFromString(input, "text/html");
            return doc.documentElement.textContent;
        }

        /**
         * Checks all interwiki patterns to reverse engineer
         * an interwiki shortcut from pasted text.
         * Returns false if nothing matches.
         *
         * @param url
         * @returns {string|boolean}
         */
        function getIwl(url) {
            const patterns = JSON.parse(JSINFO.plugins.interwikipaste.patterns);
            for (let i = 0; i < patterns.length; i++) {
                let patternConf = patterns[i];
                let regex = new RegExp(patternConf.pattern, 'g');
                let matched = regex.exec(url);
                if (matched !== null) {
                    let captured = matched[1] ? matched[1] : '';
                    if (patternConf.encode) {
                        captured = htmlDecode(captured);
                    }
                    return `${patternConf.shortcut}>${captured}`;
                }
            }
            return false;
        }

        /**
         * Possible local links:
         *  - page id without URL rewriting http://example.doku/doku.php?id=test:start
         *  - page id without URL rewriting http://example.doku/doku.php?id=test:plugins#interwikipaste
         *  - page id with .htaccess URL rewriting http://example.doku/test:plugins
         *  - page id with .htaccess URL rewriting and 'useslash' config http://example.doku/test/plugins
         *  - page id with internal URL rewriting http://example.doku/doku.php/test:plugins
         *  - http://example.doku/lib/exe/detail.php?id=test%3Aplugins&media=ns:image.jpg
         *  - http://example.doku/lib/exe/fetch.php?w=400&tok=097122&media=ns:image.jpg
         *  - http://example.doku/lib/exe/fetch.php?media=test:file.pdf
         *  - http://example.doku/_detail/ns:image.jpg?id=test%3Aplugins
         *  - http://example.doku/_media/test:file.pdf
         *  - http://example.doku/_detail/ns/image.jpg?id=test%3Aplugins
         *  - http://example.doku/_media/test/file.pdf
         *
         * @param pasted
         */
        function getLocal(pasted) {
            const url = new URL(pasted);
            const path = url.pathname;
            const href = url.href;

            // no URL rewriting
            if (path.indexOf('/doku.php') === 0 && url.search.indexOf('?') === 0) {
                const idMatch = new RegExp('(?:id=)([^&]+)');
                const matches = idMatch.exec(href);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            } else if (path.indexOf('/doku.php/') === 0) {
                // page with internal URL rewriting
                const idMatch = /(?:\/doku.php\/)([^&\?]+)/;
                const matches = path.match(idMatch);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            } else if (path.indexOf('/lib/exe/detail.php/') === 0 || path.indexOf('/lib/exe/fetch.php/') === 0) {
                // media with internal rewriting
                isMediaLink = true;
                const mediaIdMatch = new RegExp(
                    '(?:\\/lib\\/exe\\/detail.php\\/|\\/lib\\/exe\\/fetch.php\\/)([^&]+)$'
                );
                const matches = mediaIdMatch.exec(path);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            } else if (path.indexOf('/lib/exe/detail.php') === 0 || path.indexOf('/lib/exe/fetch.php') === 0) {
                // media without rewriting
                isMediaLink = true;
                const mediaIdMatch = new RegExp('(?:media=)([^&]+)');
                const matches = mediaIdMatch.exec(href);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            } else if (path.indexOf('/_media/') === 0) { // media with .htaccess rewriting
                isMediaLink = true;
                const mediaIdMatch = /(?:_media\/)([^&\?]+)/;
                const matches = href.match(mediaIdMatch);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            } else if (path.indexOf('/_detail/') === 0) { // media with .htaccess rewriting
                isMediaLink = true;
                const mediaIdMatch = /(?:_detail\/)([^&\?]+)/;
                const matches = href.match(mediaIdMatch);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            } else {
                // page with .htaccess URL rewriting
                const idMatch = /(?:\/)([^&\?]+)/;
                const matches = path.match(idMatch);
                if (matches[1]) {
                    return normalizeId(matches[1]);
                }
            }
            return false;
        }

        function normalizeId(id) {
            return ':' + id.replace(/\//g, ":");
        }

        const $editor = jQuery(this);
        const currentSelection = DWgetSelection($editor[0]);
        const selected = currentSelection.getText();
        const pasted = event.originalEvent.clipboardData.getData('text');
        let result;

        // if not a URL, let the browser handle it
        if (pasted.search(/^http[^ ]+$/) === -1) {
            return;
        }
        // first check for internal link
        if (pasted.indexOf(window.location.origin) === 0) {
            result = getLocal(pasted);
        } else {
            // next try interwiki links
            result = getIwl(pasted);
        }

        if (result) {
            event.preventDefault();
            const openSyntax = isMediaLink ? '{{' : '[[';
            const closeSyntax = isMediaLink ? '}}' : ']]';

            // if some text is selected we assume it is the link title
            if (selected) {
                result = `${openSyntax}${result}|${selected}${closeSyntax}`;
            } else {
                // check current position for surrounding link syntax
                const allInput = $editor.val();
                const caretPos = currentSelection.start;

                // check for opening brackets before
                const regBefore = new RegExp('\\[\\[ *');
                const linkOpened = regBefore.exec(allInput.substring(caretPos, caretPos - 5));

                // check for closing brackets (before opening ones) on the same line
                const textAfter = allInput.substring(caretPos);
                const nl = /\n/;
                const eol = textAfter.search(nl);

                const linkClosed = textAfter.substring(0, eol).indexOf(']]') > textAfter.substring(0, eol).indexOf('[[');

                if (!linkOpened) {
                    result = openSyntax + result;
                }
                if (!linkClosed) {
                    result = result + closeSyntax;
                }
            }
            pasteText(currentSelection, result, {});
        }
    });
});
