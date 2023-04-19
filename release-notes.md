# Release 2.9.0

## What's Changed
* Changed the order of icons in packed section by @dt2patel in https://github.com/hotwax/bopis/pull/223 and by @ymaheshwari1 in https://github.com/hotwax/bopis/pull/224
* Fixed: typo when defining the config object by @ymaheshwari1 in https://github.com/hotwax/bopis/pull/221
* Implemented: show order cards horizontally based on order ship group/part (#85zrv9fhc) by @k2maan in https://github.com/hotwax/bopis/pull/225

## New Contributors
* @dt2patel made their first contribution in https://github.com/hotwax/bopis/pull/223

**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.8.0...v2.9.0

# Release 2.8.0

## What's Changed
* Implemented: disabling of buttons on orders page based on order update permission (#85zrthgeq) by @k2maan in https://github.com/hotwax/bopis/pull/209 and https://github.com/hotwax/bopis/pull/210
* Implemented: logic to identify authorisations for the given user (#205) by @adityasharma7 in https://github.com/hotwax/bopis/pull/206
* Improved: the assigning picker setting's description on the Settings page. by @Dhiraj1405 in https://github.com/hotwax/bopis/pull/215
* Implemented: code to resend ready for pickup email (#85zrtpgxb) by @k2maan in https://github.com/hotwax/bopis/pull/212
* Fixed: Updating Delivery address permission for reroute fulfillment doesn't works  (#217) by @adityasharma7 in https://github.com/hotwax/bopis/pull/218

## New Contributors
* @Dhiraj1405 made their first contribution in https://github.com/hotwax/bopis/pull/215

**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.7.0...v2.8.0

# Release 2.7.0

## What's Changed
* Implemented: Feature to update Reroute fulfillment configuration from settings page (#208) by @adityasharma7 in https://github.com/hotwax/bopis/pull/211


**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.6.0...v.2.7.0

# Release 2.6.0

## What's Changed
* Add Spanish Label by @Adar9 in https://github.com/hotwax/bopis/pull/203
* Implemented: code to retain product search when navigating to other pages (#85zrptx3u) by @k2maan in https://github.com/hotwax/bopis/pull/202
* Fixed: Duplicate facility in facility switcher(#85zrpubf1) by @disha1202 in https://github.com/hotwax/bopis/pull/200

## New Contributors
* @Adar9 made their first contribution in https://github.com/hotwax/bopis/pull/203

**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.5.0...v2.6.0

# Release 2.5.0

## What's Changed
* implemented: support to add picker for ready to pick orders(#85zrnzf31) by @disha1202 in https://github.com/hotwax/bopis/pull/187


**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.4.0...v.2.5.0

# Release 2.4.0
## What's Changed
* Implemented: support for using api and client methods from OMS api package (#85zrm1ktj) by @k2maan in https://github.com/hotwax/bopis/pull/181
* Updated: UI for packing slip card on settings page (#85zrmkrmq) by @k2maan in https://github.com/hotwax/bopis/pull/182
* Updated: UI for shipping orders card on settings page (#85zrmkx7q) by @k2maan in https://github.com/hotwax/bopis/pull/183
* Fixed: show packing slip toggle (#85zrphr3t) by @k2maan in https://github.com/hotwax/bopis/pull/191
* Fixed: build failure due to node version 18 on github (#85zrmkx7q) by @k2maan in https://github.com/hotwax/bopis/pull/192
* Implemented: flow to get and show details on product details page (#1uvvc3x) by @adityasharma7 in https://github.com/hotwax/bopis/pull/193
* Fixed: warehouse should not be in other stores list (#1uvvc3x) by @adityasharma7 in https://github.com/hotwax/bopis/pull/195
* Fixed: loader should be dismissed when API fails on catalog and product page by @adityasharma7 in https://github.com/hotwax/bopis/pull/196
* Moved packing slip and shipping order configuration from oms to app settings(#85zrpq1yd) by @disha1202 in https://github.com/hotwax/bopis/pull/197


**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.3.0...v2.4.0

# Release 2.3.0

## What's Changed
* Implemented: Add time zone support and migrated from moment to luxon (#25k8h53) by @k2maan in https://github.com/hotwax/bopis/pull/174
* Implemented: Code to show app version and build information on Settings page (#85zrhn8w8) by @k2maan in https://github.com/hotwax/bopis/pull/175
* Implemented: support for completed orders(#85zrkm9e3) by @ymaheshwari1 in https://github.com/hotwax/bopis/pull/177
* Implemented: Flow to get and show product on Catalog page (#1uvvc2n)  by @k2maan in https://github.com/hotwax/bopis/pull/179


**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.2.0...v.2.3.0

# Release 2.2.0

## What's Changed
* Fixed: the case when getting 404 for the getUserPreference api by handling the condition in try catch block(#2gnze24) by @ymaheshwari1 in https://github.com/hotwax/bopis/pull/104
* Improved code by wrapping text on bopis order item details for products(#2h77kau) by @azkyakhan in https://github.com/hotwax/bopis/pull/114
* Improved markup and styling of segments in orders page(#2hcnrem) by @azkyakhan in https://github.com/hotwax/bopis/pull/116
* Implemented: Code to check if user has permission to access the app(#2hr41aq) by @shashwatbangar in https://github.com/hotwax/bopis/pull/129
* Updated: UI of Settings page(#32j3r6t) by @shashwatbangar in https://github.com/hotwax/bopis/pull/156
* Fixed build issue due to eslint version mismatch in dependencies (#85zrhpak3) by @k2maan in https://github.com/hotwax/bopis/pull/158
* Added hotwax-apps-theme package by @disha1202 in https://github.com/hotwax/bopis/pull/164

**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.1.0...v2.2.0

# Release 2.1.0

## What's Changed
* Add Japanese translation for the app by @itaru-tokuda in https://github.com/hotwax/bopis/pull/138
* Upgraded ionic to 6.1.15(#2uaz29u) by @disha1202 in https://github.com/hotwax/bopis/pull/140
* Added support to alias specific instance URL with environment configuration(#30dkjp1) by @disha1202 in https://github.com/hotwax/bopis/pull/149
* Remove important notice by @Jacques-Murray in https://github.com/hotwax/bopis/pull/152
* Upgraded to Ionic 6.2(#2w9wz26) by @disha1202 in https://github.com/hotwax/bopis/pull/147
* Implemented language switcher (#30yqppq) by @k2maan in https://github.com/hotwax/bopis/pull/153

## New Contributors
* @itaru-tokuda made their first contribution in https://github.com/hotwax/bopis/pull/138
* @Jacques-Murray made their first contribution in https://github.com/hotwax/bopis/pull/152
* @k2maan made their first contribution in https://github.com/hotwax/bopis/pull/153

**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.0.3...v2.1.0

# Release 2.0.3

## What's Changed
* Fixed: Instance URL should be case insensitive(#2ft61zw) by @rathoreprashant in https://github.com/hotwax/bopis/pull/122
* Improved label to "eCom Store" on Settings page (#23tw4yf) by @rathoreprashant in https://github.com/hotwax/bopis/pull/127
* Created static UI of product detail page(#2jum8ga) by @azkyakhan in https://github.com/hotwax/bopis/pull/128
* Upgraded to ionic 6(#1wn39h6) by @disha1202 in https://github.com/hotwax/bopis/pull/132


**Full Changelog**: https://github.com/hotwax/bopis/compare/v2.0.2...v2.0.3
