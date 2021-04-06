- move to multi package project with rollup export and demo page
- how can you improve a11y
- mask =
  "polygon" (clip handle inside polygon) ((automatically makes boundary polygon as well))
  "box" (clip handle inside box)
- support initial position (in addition to initial node)
- ability to pass children to mixer directly into svg, for like gradients, defs, etc
- maybe polygonProps, handleProps... things like that... :D
- ~~allow passing custom handler element~~
- ~~support initial node~~
- ~~encapsulate lalolab into the component~~
- ~~clicking on svg should also move point to location of click~~
- ~~move all props to hook~~
- ~~width and height are over-writing things attributes on svg, don't do that unless you mean to: change prop to size~~
- ~~allow passing stroke width directly and accomodate it in the size~~ Fixed by `handleOffset`
- ~~should i normalize the entry points, isn't it true that nothing can be expressed outside the bounds that can't be expressed inside?~~

- not sure if we should have a default polygon boundary in AUTO layout mode. Maybe it would be more preditable if box boundary was default and polygon was a choice.

- ~~boundary prop =
  "polygon" (formed by nodes);
  "box" (bounding box around all nodes)
  "user" (this means something else... not sure how to process it yet; i think this means we wouldn't normalize nodes and we wouldn't change viewbox or something)~~

basically there are the

nodes (and the polygon formed by them)
then there's the node bounding box, the smallest box drawn around them
then there's the background, which is the bounding box with additonal margin for the handle
