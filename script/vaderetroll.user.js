// ==UserScript==
// @name         vaderetroll
// @namespace    https://github.com/qsd222/vaderetroll
// @version      0.2
// @description  Gestion de liste noire pour bloquer les trolls dans les commentaires du site V.A
// @author       me and some copy-pasted anonymous contributors
// @downloadURL https://github.com/qsd222/vaderetroll/raw/main/script/vaderetroll.user.js
// @updateURL https://github.com/qsd222/vaderetroll/raw/main/script/vaderetroll.user.js
// @include /^http[s]?:\/\/www\.valeursactuelles\.com\/[^\.]+$
// @run-at document-end
// @grant GM_setValue
// @grant GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    let bannedDB = {

        db : JSON.parse(GM_getValue("banned",null), reviver) || new Map(),

        banUser : function(user){
            this.db.set(user.ID, user);
            GM_setValue("banned",JSON.stringify(this.db, replacer));
        },

        unbanUser : function(user){
            this.db.delete(user.ID);
            GM_setValue("banned",JSON.stringify(this.db, replacer));
        },

        bannedUsers : function(){
            return this.db;
        },

        isBanned : function (user){
            return user && this.db.has(user.ID);
        }

    }

    function replacer(key, value) {
        const originalObject = this[key];
        if(originalObject instanceof Map) {
            return {
                dataType: 'Map',
                value: Array.from(originalObject.entries()),
            };
        } else {
            return value;
        }
    }

    function reviver(key, value) {
        if(typeof value === 'object' && value !== null) {
            if (value.dataType === 'Map') {
                return new Map(value.value);
            }
        }
        return value;
    }

        
    function showContextMenu(x, y, user) {
        hideContextMenus()

        const ul = document.createElement('ul')
        const items = []

        items.push({
            label: bannedDB.isBanned(user)? 'D\u00e9bloquer '+user.pseudo+'?' : 'Bloquer '+user.pseudo+'?',
            onclick: e => handleBlockUser(user)
        })

        items.push({
            label: 'Cancel',
            onclick: hideContextMenus
        })

        items.forEach(item => {
            const li = document.createElement('li')

            li.textContent = item.label
            li.onclick = item.onclick
            li.style.padding = '20px'
            li.style.cursor = 'pointer'
            li.style.fontSize = '14px'

            li.addEventListener('mouseenter', e => {
                li.style.backgroundColor = '#f2f2f2'
            })

            li.addEventListener('mouseleave', e => {
                li.style.backgroundColor = 'white'
            })

            ul.appendChild(li)
        })

        ul.style.backgroundColor = 'white'
        ul.style.color = 'black'
        ul.style.listStyle = 'none'
        ul.style.boxShadow = '0 3px 6px 1px rgba(0, 0, 0, .5)'
        ul.style.position = 'absolute'
        ul.style.left = x + 'px'
        ul.style.top = y + 'px'
        ul.style.zIndex = '1'
        ul.className = '_blockuser_dropdown'
        ul.onclick = e => e.stopPropagation()

        document.body.appendChild(ul)

    }

    function hideContextMenus() {
        document.querySelectorAll('._blockuser_dropdown').forEach(contextmenu => contextmenu.remove())
    }

    function addContextMenu(userSpan, user) {
        if (!userSpan.classList.contains('_blockinit')){
            userSpan.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, user);
            })
            userSpan.classList.add('_blockinit');
        }
    }

    function isModerated(userSpan){
        return userSpan.classList.contains('_blockinit');
    }

    function handleBlockUser(user) {
        bannedDB.isBanned(user) ? bannedDB.unbanUser(user) : bannedDB.banUser(user);
        hideContextMenus();
        doModeration();
        //}
    }

    function doModeration() {
        document.querySelectorAll('article[role="article"][data-comment-user-id]').forEach(function(article) {
            let userSpan = article.querySelectorAll('span[about]').item(0);
            let userID = userSpan && userSpan.attributes.about.value.match(/\/user\/(\d*)/)[1];
            if (userID){
                let user = {'pseudo':userSpan.textContent, 'ID':userID};
                if (bannedDB.isBanned(user)){
                    userSpan.classList.add("bannedName");
                    article.querySelectorAll('.comment__content .field--name-comment-body').item(0).classList.add("banned");
                }else{
                    userSpan.classList.remove("bannedName");
                    article.querySelectorAll('.comment__content .field--name-comment-body').item(0).classList.remove("banned");
                }
                addContextMenu(userSpan, user);
            }
        });
    }

    function attachListener(){
        let targetNode = document.querySelector('.loadmore-btn.button.full') ;
        if (targetNode){
            var observer = new MutationObserver(function(){
                if(targetNode.style.display != 'none'){
                    doModeration();
                }
            });
            observer.observe(targetNode, { attributes: true, childList: true });
        }
    }

    function attachFirstListener(){
        let targetNode = document.querySelector('.button.full.comment');
        if (targetNode){
            var observer = new MutationObserver(function(){
                attachListener();
            });
            observer.observe(targetNode, { attributes: true, childList: true });
        }
    }

    function createStyle(){
        let element = document.createElement("style");
        element.id = "myStyleId";
        element.innerHTML = ".banned {display:none;} .bannedName{color:lightgray!important;font-style:italic!important;}";
        let header = document.getElementsByTagName("HEAD")[0] ;
        header.appendChild(element) ;
    }


    if (document.querySelector('section[id="node-article-comment"]')){
        attachFirstListener();
        createStyle();
        doModeration();
    }
})();
