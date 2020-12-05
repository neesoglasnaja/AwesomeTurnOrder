// const d20plus = {};



; (function () {
    const toInject = function () {
        const Init = function Init() {
            var d20plus = {};
            var CONFIG_OPTIONS = {};

            const addConfigOptions = function (category, options) {
                if (!CONFIG_OPTIONS[category]) CONFIG_OPTIONS[category] = options;
                else CONFIG_OPTIONS[category] = Object.assign(CONFIG_OPTIONS[category], options);
            };
            addConfigOptions("interface", {
                "_name": "Interface",
                "_player": true,
                "customTracker": {
                    "name": "Add Additional Info to Tracker",
                    "default": true,
                    "_type": "boolean"
                },
                "trackerCol1": {
                    "name": "Tracker Column 1",
                    "default": "HP",
                    "_type": "_FORMULA"
                },
                "trackerCol2": {
                    "name": "Tracker Column 2",
                    "default": "AC",
                    "_type": "_FORMULA"
                },
                "trackerCol3": {
                    "name": "Tracker Column 3",
                    "default": "PP",
                    "_type": "_FORMULA"
                },
                "trackerSheetButton": {
                    "name": "Add Sheet Button To Tracker",
                    "default": false,
                    "_type": "boolean"
                },
                "minifyTracker": {
                    "name": "Shrink Initiative Tracker Text",
                    "default": false,
                    "_type": "boolean"
                },
                "showDifficulty": {
                    "name": "Show Difficulty in Tracker",
                    "default": true,
                    "_type": "boolean"
                },
                "emoji": {
                    "name": "Add Emoji Replacement to Chat",
                    "default": true,
                    "_type": "boolean",
                    "_player": true
                },
                "showCustomArtPreview": {
                    "name": "Show Custom Art Previews",
                    "default": true,
                    "_type": "boolean"
                }
            });

            // bind tokens to the initiative tracker
            d20plus.bindTokens = function () {
                // Gets a list of all the tokens on the current page:
                const curTokens = Campaign.pages.get(Campaign.activePage()).thegraphics.toArray();
                curTokens.forEach(t => {
                    d20plus.bindToken(t);
                });
            };
            // bind token HP to initiative tracker window HP field
            d20plus.bindToken = function (token) {
                function getInitTrackerToken() {
                    const $window = $("#initiativewindow");
                    if (!$window.length) return [];
                    return $window.find(`li.token`).filter((i, e) => {
                        return $(e).data("tokenid") === token.id;
                    });
                }

                const $initToken = getInitTrackerToken();
                if (!$initToken.length) return;
                const $iptHp = $initToken.find(`.hp`);
                const npcFlag = token.character ? token.character.attribs.find((a) => {
                    return a.get("name").toLowerCase() === "npc";
                }) : null;
                // if there's a HP column enabled
                if ($iptHp.length) {
                    let toBind;
                    if (!token.character || npcFlag && npcFlag.get("current") == "1") {
                        const hpBar = d20plus.getCfgHpBarNumber();
                        // and a HP bar chosen
                        if (hpBar) {
                            $iptHp.text('_3ХП:' + token.attributes[`bar${hpBar}_value`])
                        }

                        toBind = (token, changes) => {
                            const $initToken = getInitTrackerToken();
                            if (!$initToken.length) return;
                            const $iptHp = $initToken.find(`.hp`);
                            const hpBar = d20plus.getCfgHpBarNumber();

                            if ($iptHp && hpBar) {
                                if (changes.changes[`bar${hpBar}_value`]) {
                                    $iptHp.text('_1ХП:' + token.changed[`bar${hpBar}_value`]);
                                }
                            }
                        };
                    } else {
                        toBind = (token, changes) => {
                            const $initToken = getInitTrackerToken();
                            if (!$initToken.length) return;
                            const $iptHp = $initToken.find(`.hp`);
                            if ($iptHp) {
                                $iptHp.text('_2ХП:' + token.character.autoCalcFormula(d20plus.formulas[d20plus.sheet].hp));
                            }
                        }
                    }
                    // clean up old handler
                    if (d20plus.tokenBindings[token.id]) token.off("change", d20plus.tokenBindings[token.id]);
                    // add new handler
                    d20plus.tokenBindings[token.id] = toBind;
                    token.on("change", toBind);
                }
            };
            d20plus.tokenBindings = {};

            d20plus.sheet = "ogl";
            d20plus.formulas = {
                _options: ["--Empty--", "AC", "HP", "Passive Perception", "Spell DC"],
                "ogl": {
                    "cr": "@{npc_challenge}",
                    "ac": "@{ac}",
                    "npcac": "@{npc_ac}",
                    "hp": "@{hp}",
                    "pp": "@{passive_wisdom}",
                    "macro": "",
                    "spellDc": "@{spell_save_dc}"
                },
                "community": {
                    "cr": "@{npc_challenge}",
                    "ac": "@{AC}",
                    "npcac": "@{AC}",
                    "hp": "@{HP}",
                    "pp": "10 + @{perception}",
                    "macro": "",
                    "spellDc": "@{spell_save_dc}"
                },
                "shaped": {
                    "cr": "@{challenge}",
                    "ac": "@{AC}",
                    "npcac": "@{AC}",
                    "hp": "@{HP}",
                    "pp": "@{repeating_skill_$11_passive}",
                    "macro": "shaped_statblock",
                    "spellDc": "@{spell_save_dc}"
                }
            };

            d20plus.cfg = { current: {} };
            d20plus.cfg.get = (group, key) => {
                if (d20plus.cfg.current[group] === undefined) return undefined;
                if (d20plus.cfg.current[group][key] === undefined) return undefined;
                if (CONFIG_OPTIONS[group][key]._type === "_SHEET_ATTRIBUTE") {
                    if (!NPC_SHEET_ATTRIBUTES[d20plus.cfg.current[group][key]]) return undefined;
                    return NPC_SHEET_ATTRIBUTES[d20plus.cfg.current[group][key]][d20plus.sheet];
                }
                if (CONFIG_OPTIONS[group][key]._type === "_SHEET_ATTRIBUTE_PC") {
                    if (!PC_SHEET_ATTRIBUTES[d20plus.cfg.current[group][key]]) return undefined;
                    return PC_SHEET_ATTRIBUTES[d20plus.cfg.current[group][key]][d20plus.sheet];
                }
                return d20plus.cfg.current[group][key];
            };

            // get the user config'd token HP bar
            d20plus.getCfgHpBarNumber = function () {
                const bars = [
                    'npc_hpbase',
                    'ac',
                ];
                return bars[0] === "npc_hpbase" ? 1 : bars[1] === "npc_hpbase" ? 2 : bars[2] === "npc_hpbase" ? 3 : null;
            };

            d20plus.initiativeHeaders = `<div class="header init-header">
        <span class="ui-button-text initmacro init-sheet-header"></span>
        <span class="initiative init-init-header" alt="Initiative" title="Initiative">Init</span>
        <span class="cr" alt="CR" title="CR">CR</span>
        <div class="tracker-header-extra-columns"></div>
        </div>`;
            d20plus.initiativeTemplate = `<script id="tmpl_initiativecharacter" type="text/html">
    <![CDATA[
        <li class='token <$ if (this.layer === "gmlayer") { $>gmlayer<$ } $>' data-tokenid='<$!this.id$>' data-currentindex='<$!this.idx$>'>
            <$ var token = Campaign.pages.get(Campaign.activePage()).thegraphics.get(this.id); $>
            <$ var char = (token) ? token.character : null; $>
            <span alt='Initiative' title='Initiative' class='initiative <$ if (this.iseditable) { $>editable<$ } $>'>
                <$!this.pr$>
            </span>
            <$ if (char) { $>
                <$ var npc = char.attribs ? char.attribs.find(function(a){return a.get("name").toLowerCase() == "npc" }) : null; $>
            <$ } $>
            <div class="tracker-extra-columns">
                <!--5ETOOLS_REPLACE_TARGET-->
            </div>
            <$ if (this.avatar) { $><img src='<$!this.avatar$>' /><$ } $>
            <span class='name'><$!this.name$></span>
                <div class='clear' style='height: 0px;'></div>
                <div class='controls'>
            <span class='pictos remove'>#</span>
            </div>
        </li>
    ]]>
    </script>`;

            d20plus.initErrorHandler = null;
            d20plus.setTurnOrderTemplate = function () {
                console.log('CCCCCCCC', Campaign);
                if (!d20plus.turnOrderCachedFunction) {
                    d20plus.turnOrderCachedFunction = Campaign.initiativewindow.rebuildInitiativeList;
                    d20plus.turnOrderCachedTemplate = $("#tmpl_initiativecharacter").clone();
                }

                Campaign.initiativewindow.rebuildInitiativeList = function () {
                    console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                    var html = d20plus.initiativeTemplate;
                    var columnsAdded = [];
                    $(".tracker-header-extra-columns").empty();

                    const cols = [
                        'HP',
                        'AC',
                        'Passive Perception'
                        // d20plus.cfg.get("interface", "trackerCol1"),
                        // d20plus.cfg.get("interface", "trackerCol2"),
                        // d20plus.cfg.get("interface", "trackerCol3")
                    ];

                    const headerStack = [];
                    const replaceStack = [
                        // this is hidden by CSS
                        // `<span class='cr' alt='CR' title='CR'>
                        // 	<$ if(npc && npc.get("current") == "1") { $>
                        // 		<$ var crAttr = char.attribs.find(function(e) { return e.get("name").toLowerCase() === "npc_challenge" }); $>
                        // 		<$ if(crAttr) { $>
                        // 			<$!crAttr.get("current")$>
                        // 		<$ } $>
                        // 	<$ } $>
                        // </span>`
                    ];
                    cols.forEach((c, i) => {
                        switch (c) {
                            case "HP": {
                                const hpBar = d20plus.getCfgHpBarNumber();
                                replaceStack.push(`
                                <span class='hp tracker-col' alt='HP' title='HP'>ХП:
                                    <$ if(npc && npc.get("current") == "1") { $>
                                        ${hpBar ? `<$!token.attributes.bar${hpBar}_value$>` : ""}
                                    <$ } else if (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") { $>
                                        <$!char.autoCalcFormula('${d20plus.formulas[d20plus.sheet].hp}')$>
                                    <$ } else { $>
                                        <$!"\u2014"$>
                                    <$ } $>
                                </span>
                            `);
                                // headerStack.push(`<span class='tracker-col'>HP</span>`);
                                break;
                            }
                            case "AC": {
                                replaceStack.push(`
                                <span class='ac tracker-col' alt='AC' title='AC'>КД:
                                    <$ if(npc && npc.get("current") == "1" && typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") { $>
                                        <$!char.autoCalcFormula('${d20plus.formulas[d20plus.sheet].npcac}')$>
                                    <$ } else if (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") { $>
                                        <$!char.autoCalcFormula('${d20plus.formulas[d20plus.sheet].ac}')$>
                                    <$ } else { $>
                                        <$!"\u2014"$>
                                    <$ } $>
                                </span>
                            `);
                                headerStack.push(`<span class='tracker-col'>AC</span>`);
                                break;
                            }
                            case "Passive Perception": {
                                replaceStack.push(`
                                <$ var passive = (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") ? (char.autoCalcFormula('@{passive_wisdom}') || char.autoCalcFormula('${d20plus.formulas[d20plus.sheet].pp}')) : "\u2014"; $>
                                <span class='pp tracker-col' alt='Passive Perception' title='Passive Perception'>ВНИМ (МУД)<$!passive$></span>
                            `);
                                headerStack.push(`<span class='tracker-col'>PP</span>`);
                                break;
                            }
                            // case "Spell DC": {
                            // 	replaceStack.push(`
                            // 		<$ var dc = (typeof char !== "undefined" && char && typeof char.autoCalcFormula !== "undefined") ? (char.autoCalcFormula('${d20plus.formulas[d20plus.sheet].spellDc}')) : "\u2014"; $>
                            // 		<span class='dc tracker-col' alt='Spell DC' title='Spell DC'><$!dc$></span>
                            // 	`);
                            // 	headerStack.push(`<span class='tracker-col'>DC</span>`);
                            // 	break;
                            // }
                            default: {
                                replaceStack.push(`<span class="tracker-col"/>`);
                                headerStack.push(`<span class="tracker-col"/>`);
                            }
                        }
                    });

                    // console.log("use custom tracker val was ", d20plus.cfg.get("interface", "customTracker"))
                    // if (d20plus.cfg.get("interface", "customTracker")) {
                    $(`.init-header`).show();
                    if (d20plus.cfg.get("interface", "trackerSheetButton")) {
                        $(`.init-sheet-header`).show();
                    } else {
                        $(`.init-sheet-header`).hide();
                    }
                    $(`.init-init-header`).show();
                    const $header = $(".tracker-header-extra-columns");
                    // prepend/reverse used since tracker gets populated in right-to-left order
                    headerStack.forEach(h => $header.prepend(h))
                    html = html.replace(`<!--5ETOOLS_REPLACE_TARGET-->`, replaceStack.reverse().join(" \n"));
                    // } else {
                    // 	$(`.init-header`).hide();
                    // 	$(`.init-sheet-header`).hide();
                    // 	$(`.init-init-header`).hide();
                    // }

                    $("#tmpl_initiativecharacter").replaceWith(html);

                    // Hack to catch errors, part 1
                    const startTime = (new Date).getTime();

                    var results = d20plus.turnOrderCachedFunction.apply(this, []);
                    setTimeout(function () {
                        $(".initmacrobutton").unbind("click");
                        $(".initmacrobutton").bind("click", function () {
                            console.log("Macro button clicked");
                            tokenid = $(this).parent().parent().data("tokenid");
                            var token, char;
                            var page = Campaign.activePage();
                            if (page) token = page.thegraphics.get(tokenid);
                            if (token) char = token.character;
                            if (char) {
                                char.view.showDialog();
                                // d20.textchat.doChatInput(`%{` + char.id + `|` + d20plus.formulas[d20plus.sheet]["macro"] + `}`)
                            }
                        });

                        d20plus.bindTokens();
                    }, 100);

                    // Hack to catch errors, part 2
                    if (d20plus.initErrorHandler) {
                        window.removeEventListener("error", d20plus.initErrorHandler);
                    }
                    d20plus.initErrorHandler = function (event) {
                        // if we see an error within 250 msec of trying to override the initiative window...
                        if (((new Date).getTime() - startTime) < 250) {
                            console.log("ERROR: failed to populate custom initiative tracker, restoring default...");
                            // restore the default functionality
                            $("#tmpl_initiativecharacter").replaceWith(d20plus.turnOrderCachedTemplate);
                            return d20plus.turnOrderCachedFunction();
                        }
                    };
                    window.addEventListener("error", d20plus.initErrorHandler);
                    return results;
                };

                const getTargetWidth = () => (d20plus.cfg.get("interface", "minifyTracker") ? 250 : 350);
                // wider tracker
                const cachedDialog = Campaign.initiativewindow.$el.dialog;
                Campaign.initiativewindow.$el.dialog = (...args) => {
                    const widen = d20plus.cfg.get("interface", "customTracker");
                    // const widen = false;
                    if (widen && args[0] && args[0].width) {
                        args[0].width = getTargetWidth();
                    }
                    cachedDialog.bind(Campaign.initiativewindow.$el)(...args);
                };

                // if the tracker is already open, widen it
                if (Campaign.initiativewindow.model.attributes.initiativepage) Campaign.initiativewindow.$el.dialog("option", "width", getTargetWidth());
            };

            return d20plus;
        }


        const D20plus = function () {
            function doBootstrap() {
                const d20plus = Init();
                $("#initiativewindow .characterlist").before(d20plus.initiativeHeaders);
                d20plus.setTurnOrderTemplate();
                Campaign.initiativewindow.rebuildInitiativeList();
            }

            (function doCheckDepsLoaded() {
                console.log("🚀 ", window.jQuery, window.Campaign)

                if (typeof window.$ !== "undefined" && window.Campaign && window.Campaign.initiativewindow) {
                    console.log(1111);
                    doBootstrap();
                } else {
                    setTimeout(doCheckDepsLoaded, 500);
                }
            })();
        };

        // if we are the topmost frame, inject
        if (window.top === window.self) {
            D20plus();
        }

    }

    function inject(fn) {
        const script = document.createElement('script')
        script.text = `(${fn.toString()})();`
        document.documentElement.appendChild(script)
    }

    inject(toInject)
})()