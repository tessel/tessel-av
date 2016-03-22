```
Audio Output
  -o or --output=[type:]path
    Direct output to path, rather than playing audio on the native
    audio device. The format of the output is specified by type which
    can be any of the supported output formats (see below.) If a
    format is not specified, one will be inferred from path.  If path
    is a single dash (-), the output will be written to standard
    output.

  -d or --no-dither
    Do not dither the output PCM samples. This may result in lower
    sound quality but is useful for analyzing output from the decoder.

  --downsample
    Reduce the output sampling frequency 2:1. This also reduces the
    computational overhead of the decoder.

  --fade-in[=duration]
    Gradually fade-in the audio from each file over duration.  If not
    specified, the default duration is 0:05 (five seconds.)

  -a or --attenuate=decibels or --amplify=decibels
    Attenuate or amplify the signal by decibels (dB).  The signal is
    attenuated if the decibel value is negative; it is amplified if
    the value is positive.  The decibel value must be in the range
  -175 to +18.  The value may be fractional, e.g. -1.5.  A value of
    0 will leave the signal unchanged.  Each step of 6 dB will
    approximately halve (in the negative direction) or double (in the
    positive direction) the strength of the signal.

  Channel Selection
  For dual channel streams, an output channel should be selected. If one is
  not selected, the first (left) channel will be used.

  For stereo streams, making a channel selection other than stereo will
  cause the output to be monaural.

  -1 or --left
    Output the first (left) channel only.

  -2 or --right
    Output the second (right) channel only.

  -m or --mono
    Mix the left and right channels together.

  -S or --stereo
    Force stereo output, even if the stream is single or dual channel.

  Playback
  -s or --start=time
    Begin playing at time, given as an offset from the beginning of
    the first file (0:00:00), seeking as necessary.

  -t or --time=duration
    Stop playback after the playing time of the output audio equals
    duration.

  -z or --shuffle
    Randomize the list of files given on the command line for
    playback.

  -r or --repeat[=max]
    Play the input files max times, or indefinitely. Playback can
    still be stopped by giving a time limit with the -t (--time)
    option. If -z (--shuffle) is also used, the files will be
    continuously shuffled and repeated in such a way that the same
    file is not played again until at least half of the other files
    have played in the interim.

```
