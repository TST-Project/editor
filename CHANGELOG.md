# Changelog

## 17 May 2021

* testing on Edge and WebKit browsers
* new paratext types: verse numbering, total stanzas, and total chapters
* paratexts and decorations can have an associated Text ID
* new paratext placement: top, bottom, left, and right
* author field is XML-enabled
* editor hints added for \<placeName\>,\<foreign\>, \<unclear reason="consonant\_unclear"\>
* editor hints added for seg @function: "verse\_numbering", "total\_stanzas", "total\_chapters"

## 3 May 2021

* added upgrade function so that old files get upgraded upon load
* removed editionStmt, added titleStmt/editor
* multiple editor people are supported
* added "vowel\_unclear" and "eccentric\_ductus" as reasons for \<unclear\>

## 16 April 2021

* "Old shelfmark" changed to "Other identifiers"

## 15 April 2021

* puḷḷi in italics
* style updates
* text title is an XML field
* Latin added as a language
* styling updates and bug fixes

## 8 April 2021

* added German as a text languge
* added `<provenance>`
* added `<gap>` as a child of `<del>`
* added `<surplus>`, `<supplied>`
* added `@unit="character"` for `<gap>` and `<damage>`
* added `<seg>` and `@function` to tag rubric, incipit, etc.
* added full text transcription field
* added Text ID (`@xml:id`) field
* cleanups, enhancements, etc.
