<?php

/**
 * Class action_plugin_interwikipaste
 */
class action_plugin_interwikipaste extends DokuWiki_Action_Plugin
{
    /**
     * Register handlers for event hooks
     *
     * @param Doku_Event_Handler $controller
     */
    public function register(Doku_Event_Handler $controller)
    {
        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER', $this, 'addInterwikisToJSINFO');
    }

    public function addInterwikisToJSINFO(Doku_Event $event)
    {
        global $JSINFO;
        $JSINFO['plugins']['interwikipaste']['patterns'] = json_encode($this->getInterwikiPatterns());
    }

    /**
     * Loads interwiki configuration and transforms it into regular expressions
     *
     * @return array
     */
    protected function getInterwikiPatterns()
    {
        $patterns = [];
        $wikis = getInterwiki();

        // sort urls by longer first (probably more specific matches)
        uasort($wikis, function ($a, $b) {
            if (strlen($a) === strlen($b)) {
                return 0;
            }
            return (strlen($a) > strlen($b)) ? -1 : 1;
        });

        foreach ($wikis as $shortcut => $url) {
            // escaping now makes it easier to manipulate regex patterns later
            $pattern = preg_quote_cb($url);
            $encode = (preg_match('/{URL|QUERY\\\}/', $url) === 1);

            // replace already escaped placeholders with named groups
            $cnt = 0;
            $pattern = preg_replace(
                '/\\\{(URL|NAME|SCHEME|HOST|PORT|PATH|QUERY)\\\}/',
                '([^ ]+)',
                $pattern,
                -1,
                $cnt
            );

            if (!$cnt) {
                $pattern .= '([^ ]+)';
            }

            $patterns[] = [
                'shortcut' => $shortcut,
                'pattern' => $pattern,
                'encode' => $encode,
            ];
        }

        return $patterns;
    }
}
