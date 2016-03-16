```
-f <text file>   Text file to speak
--stdin    Read text input from stdin instead of a file

If neither -f nor --stdin, then <words> are spoken, or if none then text
is spoken from stdin, each line separately.

-a <integer>
     Amplitude, 0 to 200, default is 100
-g <integer>
     Word gap. Pause between words, units of 10mS at the default speed
-k <integer>
     Indicate capital letters with: 1=sound, 2=the word "capitals",
     higher values indicate a pitch increase (try -k20).
-l <integer>
     Line length. If not zero (which is the default), consider
     lines less than this length as end-of-clause
-p <integer>
     Pitch adjustment, 0 to 99, default is 50
-s <integer>
     Speed in words per minute, 80 to 450, default is 175
-v <voice name>
     Use voice file of this name from espeak-data/voices
-w <wave file name>
     Write speech to this WAV file, rather than speaking it directly
-b     Input text encoding, 1=UTF8, 2=8 bit, 4=16 bit
-m     Interpret SSML markup, and ignore other < > tags
-q     Quiet, don't produce any speech (may be useful with -x)
-x     Write phoneme mnemonics to stdout
-X     Write phonemes mnemonics and translation trace to stdout
-z     No final sentence pause at the end of the text
--compile=<voice name>
     Compile pronunciation rules and dictionary from the current
     directory. <voice name> specifies the language
--ipa      Write phonemes to stdout using International Phonetic Alphabet
           --ipa=1 Use ties, --ipa=2 Use ZWJ, --ipa=3 Separate with _
--path="<path>"
     Specifies the directory containing the espeak-data directory
--pho      Write mbrola phoneme data (.pho) to stdout or to the file in --phonout
--phonout="<filename>"
     Write phoneme output from -x -X --ipa and --pho to this file
--punct="<characters>"
     Speak the names of punctuation characters during speaking.  If
     =<characters> is omitted, all punctuation is spoken.
--split="<minutes>"
     Starts a new WAV file every <minutes>.  Used with -w
--stdout   Write speech output to stdout
--version  Shows version number and date, and location of espeak-data
--voices=<language>
     List the available voices for the specified language.
     If <language> is omitted, then list all voices.
```
