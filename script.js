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
         * an interwiki link from pasted and selected text.
         * Returns the original text if nothing matches.
         *
         * @param url
         * @param title
         * @returns {string}
         */
        function getIwl(url, title) {
            const patterns = JSON.parse(JSINFO.plugins.interwikipaste.patterns);
            if (title) {
                title = '|' + title;
            }
            for (let i = 0; i < patterns.length; i++) {
                let p = patterns[i];
                let r = new RegExp(p.pattern, 'g');
                let f = r.exec(url);
                if (f !== null) {
                    let captured = f[1];
                    if (p.encode) {
                        captured = htmlDecode(captured);
                    }
                    return `[[${p.shortcut}>${captured}${title}]]`;
                }
            }
            return `[[${url}${title}]]`;
        }

        event.preventDefault();

        const $editor = jQuery(this);
        const currentSelection = DWgetSelection($editor[0]);
        const selected = currentSelection.getText();
        const pasted = event.originalEvent.clipboardData.getData('text');
        let result;

        // if not a URL, just paste it
        if (pasted.search(/^http[^ ]+$/) === -1) {
            result = pasted;
        } else {
            result = getIwl(pasted, selected);
        }

        pasteText(currentSelection, result, {});
    });
});
