This is a web app designed to faciliate a favour auction. The premise of a favour auction is that participants submit various "favours" that they would be happy to do for someone else eg. 3 hours of linear algebra tutoring, write and record a song on acoustic guitar for you, message you every day for a month etc

Everyone starts with 100 favour points. Items are auctioned of in the following formats:

- English auction
- Dutch auction
- First price sealed
- Vikrey (winner pays second highest bid)
- Chinese
- Penny, (parameters chosen by admin, all profits go to person whose item is being sold)

There should be two main pages:

a password locked admin page:

- password should be set as an env variable
- should have a reset auction button to reinitialise everything
- next item button
- auction configuration options
  - auction type (or random)
    - penny auction parameters
  - option to prevent new items being added after auction started
- ability to change configuration during auction
- show number of items remaining
- graph of price over time
- a record of who sold what to who which can be exported as a string that can be pasted into discord

a participant page:

- participants should enter their name (which is saved in localstorage to preserve over reload)
- ability to add item
- show number of items remaining
- show number of items they are selling that are remaining
- their current balance (start at 100)
- graph of their balance over time
- graph of price over time (for continuous auctions)
- ability to place bid (either single shot or continuous)
- at end of auction display summary

theme:
- dark mode
- professional
- elegant graphs

database: neon with vercel integration