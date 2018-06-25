EXPERIMENTAL

Testing out p2p video chat, built on dat. Drawing from [hypercast](https://github.com/louiscenter/hypercast).

Basics seem to work, not super stable, but there is a consistent 5s lag on incoming streams, not sure why

# To Do

- performance improvements
- rooms (synchronizing peer lists)
- chat
- muting
- screensharing (currently doesn't seem to be any standard web API for doing so)

# Usage

1. Clone this repo
2. `npm install`
3. `npm run compile`
4. `npm start`

You'll have a hash at the top of the page that you can copy and give to others. They can paste that into the `Add peer` input and hit `Enter` to add your stream. (Currently this add is not reciprocal, i.e. their stream won't automatically be added to you; I'll add this soon). Also not really tested 😅.