(function () {
    const toInject = function () {
        const formulas = {
            "ac": "@{ac}",
            "npcac": "@{npc_ac}",
            "hp": "@{hp}",
            "pp": "@{passive_wisdom}",
        };
        const initiativeTemplate = `
        <![CDATA[
            <li class='__awesome-turn-order--item token <$ if (this.layer === "gmlayer") { $>gmlayer<$ } $>' data-tokenid='<$!this.id$>' data-currentindex='<$!this.idx$>'>
                <$ var token = Campaign.pages.get(Campaign.activePage()).thegraphics.get(this.id); $>
                <$ var char = (token) ? token.character : null; $>
                <$ if (char) { $>
                    <$ var npc = char.attribs ? char.attribs.find(function(a){return a.get("name").toLowerCase() == "npc" }) : null; $>
                    <$ } $>
                <$ if (this.avatar) { $><img class='avatar' src='<$!this.avatar$>' /><$ } $>
                <span class='name'><$!this.name$></span>
                <div class="__awesome-turn-order--extra">
                    <!--REPLACE_TARGET-->
                </div>
                <span alt='Initiative' title='Initiative' class='initiative <$ if (this.iseditable) { $>editable<$ } $>'>
                    <$!this.pr$>
                </span>
                <div class='controls'>
                    <span class='pictos remove'>#</span>
                </div>
            </li>
        ]]>`;

        const tokenBindings = {};
        // Bind tokens to the initiative tracker
        const bindTokens = () => {
            // Gets a list of all the tokens on the current page
            const curTokens = Campaign.pages.get(Campaign.activePage()).thegraphics.toArray();
            curTokens.forEach(bindToken);
        };
        // bind token HP to initiative tracker window HP field
        const bindToken = function (token) {
            function getInitTrackerToken() {
                const $initiativeContainer = document.querySelector("#initiativewindow");
                if (!$initiativeContainer.length) return [];
                return [...$initiativeContainer.querySelectorAll(`li.token`)].find(($element) => {
                    return $element.getAttribute('[data-tokenid]') === token.id;
                });
            }

            const $initToken = getInitTrackerToken();
            if (!$initToken.length) return;
            const npcFlag = token.character ? token.character.attribs.find((a) => {
                return a.get("name").toLowerCase() === "npc";
            }) : null;

            const toBind = (token, changes) => {
                const $initToken = getInitTrackerToken();
                if (!$initToken.length) return;
                const $iptHp = $initToken.querySelector(`.hp`);

                if (!token.character || npcFlag && npcFlag.get("current") == "1") {
                    if (changes.changes[`bar1_value`]) {
                        $iptHp.innerText = token.changed[`bar1_value`];
                    }
                } else {
                    $iptHp.innerText = token.character.autoCalcFormula(formulas.hp);
                }

            };
            // clean up old handler
            if (tokenBindings[token.id]) token.removeEventListener("change", tokenBindings[token.id]);
            // add new handler
            tokenBindings[token.id] = toBind;
            token.addEventListener("change", toBind);
        };

        const initTurnOrderPatch = function () {
            const turnOrderCachedFunction = Campaign.initiativewindow.rebuildInitiativeList;

            const $initiativeContent = document.querySelector('#initiativewindow')
            $initiativeContent.style.setProperty('height', '350px');

            const $initiativeDialog = $initiativeContent.closest('[role="dialog"]');
            $initiativeDialog.classList.add('__awesome-turn-order');
            $initiativeDialog.style.setProperty('width', '350px');

            Campaign.initiativewindow.rebuildInitiativeList = function () {
                let html = initiativeTemplate;
                const $extraContainer = document.querySelector(".__awesome-turn-order--extra");
                if ($extraContainer) {
                    $extraContainer.innerHTML = '';
                }


                const replaceStack = [
                    `
                        <span class='hp __awesome-turn-order--extra-prop' alt='HP' title='HP'>
                            <$ if(npc && npc.get("current") == "1") { $>
                                <$!token.attributes.bar1_value$>
                            <$ } else if (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") { $>
                                <$!char.autoCalcFormula('${formulas.hp}')$>
                            <$ } else { $>
                                <$!"\u2014"$>
                            <$ } $>
                        </span>
                    `,
                    `
                        <span class='ac __awesome-turn-order--extra-prop' alt='AC' title='AC'>
                            <$ if(npc && npc.get("current") == "1" && typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") { $>
                                <$!char.autoCalcFormula('${formulas.npcac}')$>
                            <$ } else if (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") { $>
                                <$!char.autoCalcFormula('${formulas.ac}')$>
                            <$ } else { $>
                                <$!"\u2014"$>
                            <$ } $>
                        </span>
                    `,
                    `
                        <$ var passive = (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") ? (char.autoCalcFormula('@{passive_wisdom}') || char.autoCalcFormula('${formulas.pp}')) : "\u2014"; $>
                        <span class='pp __awesome-turn-order--extra-prop' alt='Passive Perception' title='Perc'><$!passive$></span>
                    `,
                ];

                html = html.replace(`<!--REPLACE_TARGET-->`, replaceStack.join(" \n"));
                document.querySelector("#tmpl_initiativecharacter").innerHTML = html;


                const results = turnOrderCachedFunction.apply(this, []);
                setTimeout(function () {
                    bindTokens();
                }, 500);
                return results;
            };

            Campaign.initiativewindow.rebuildInitiativeList();
        }

        // if we are the topmost frame, inject
        if (window.top === window.self) {
            (function doCheckDepsLoaded() {
                if (document.readyState === 'complete' && window.Campaign && window.Campaign.initiativewindow) {
                    if (window.is_gm) initTurnOrderPatch();
                } else {
                    setTimeout(doCheckDepsLoaded, 500);
                }
            })();
        }

    }

    function inject(fn) {
        const script = document.createElement('script')
        script.text = `(${fn.toString()})();`
        document.documentElement.appendChild(script)
    }

    inject(toInject);
})()