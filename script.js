jQuery(function () {
    jQuery('#wiki__text').on('paste', function (event) {
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

        const $editor = jQuery(this);
        const currentSelection = DWgetSelection($editor[0]);
        const selected = currentSelection.getText();
        const pasted = event.originalEvent.clipboardData.getData('text');
        let result;

        // if not a URL, let the browser handle it
        if (pasted.search(/^http[^ ]+$/) === -1) {
            return;
        }
        result = getIwl(pasted);

        if (result) {
            event.preventDefault();
            // if some text is selected we assume it is the link title
            if (selected) {
                result = `[[${result}|${selected}]]`;
            } else {
                // check current position for surrounding link syntax
                const allInput = $editor.val();
                const caretPos = currentSelection.start;

                // check for opening brackets before
                const regBefore = new RegExp('\\[\\[ *');
                const linkOpened = regBefore.exec(allInput.substring(caretPos, caretPos - 5));

                // check for closing brackets (before opening ones)
                const textAfter = allInput.substring(caretPos);
                const linkClosed = textAfter.indexOf(']]') > textAfter.indexOf('[[');

                if (!linkOpened) {
                    result = '[[' + result;
                }
                if (!linkClosed) {
                    result = result + ']]';
                }
            }
            pasteText(currentSelection, result, {});
        }
    });
});
