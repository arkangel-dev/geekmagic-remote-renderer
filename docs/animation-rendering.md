# Animation Rendering

So... Animation rendering. Obviously for animations I dont want the host client to continously update the screen over websocket just for animations. The idea I have is like we upload a file. This file will describe changes to bring to the screen in a series of frames. Ok so its goes something like this

| Depth | Title             | Size    | Description                                                 |
| ----- | ----------------- | ------- | ----------------------------------------------------------- |
| 1     | Header            | 8 bytes | The word 'GMPANIF1' encoded in ascii.                       |
| 1     | Height            | 1 bytes | Height of the animation                                     |
| 1     | Width             | 1 bytes | Width of the animation                                      |
| 1     | Palette Size      | 1 byte  | Size of the color palette                                   |
| 2     | Palette color     | 2 byte  | Palette color value                                         |
| 1     | Frame Count       | 2 bytes | Unsigned little endian. Number of frames                    |
| 2     | Delay Before      | 2 bytes | Milliseconds to wait before rendering the frame             |
| 2     | Frame Pixel Count | 2 bytes | Max value of 65536 lets you over the 240x240 pixel position |
| 3     | X                 | 1 bytes | X position                                                  |
| 3     | Y                 | 1 bytes | Y position                                                  |
| 3     | ColorIndex        | 1 byte  | Color (RGB565)                                              |

- When generating the animation, each frame will contain the pixels only if the delta between a pixel in the current frame and previous frame exceeds a threshold. Since the display wont blit between frames, less data is wasted. The first frame is exempt from this rule.

- I have added a global palette to cut down on file size. With the coin example, a 240x240 with a max delta of 30 results in 697.3 KB. The ESP is gonna laugh at my face if I came to to with that big an asset!