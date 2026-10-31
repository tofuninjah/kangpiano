// About section copy. whyPiano is the 2016 site's "reasons to play" text
// with typos fixed and US spelling; the paragraph on test scores and
// Alberta high-school credits was dropped as unsourced and not relevant to
// Hawaiʻi. tests/content.test.ts checks the page renders exactly this.

export const about = {
  quote: {
    lead: 'The piano is always there,',
    emphasis: 'ready for you to pour out your soul.',
  },
  bio: 'Hyejeong studied music at Mokwon University and has taught private piano and violin lessons in Hawaiʻi and Korea for many years. She believes playing sharpens the mind, steadies the hands, and gives every student a lifelong place to set down the day.',
  // Used once a portrait is added at src/assets/images/portrait.(jpg|png|webp).
  portraitAlt: 'Hyejeong Kang at the piano',
  whyPiano: [
    'There are many and varied reasons to play the piano. It is a beautiful instrument with a beautiful look and a beautiful sound. It can be a soloist’s instrument or a group instrument. It sharpens the mind and body. The gift of music is therapeutic. There are many careers that require piano skills. The list goes on and on.',
    'Playing the piano develops a high level of manual dexterity. While it may seem very simple to just push the keys, learning to perform complex pieces with precision and emotion needs a little time and a very human touch. That is one reason why professional pianists have not been replaced by computers. It is more complicated than patting your head while rubbing your tummy! But it is ever so much more rewarding too!',
    'The piano is also a staple of family sing-alongs — whether you are singing Christmas carols or playing some favorite movie tunes. The very design of the piano lends itself to groups of people gathered around, singing along. This is one of the most social of activities. This is where some of our warmest and most treasured memories are made.',
    'There are many jobs and careers for pianists. One can be the piano player in a lounge, on a cruise ship, in a church (mass, weddings, funerals), or in a band. One can be an instructor with a college or university or teach out of a home studio. One can accompany vocalists, choirs, violinists, and others as they perform for competition or for an audience. One can compose movie scores or commercial jingles or orchestral pieces. The possibilities are endless.',
    'The ability to play a musical instrument and to express oneself with a musical instrument is very healthy and therapeutic. Stresses can melt away. The piano is always there, ready for you to pour out your soul. It is a most patient and agreeable companion. If you’re upset, go ahead and thunder away on the keyboard, and when you’re done and feeling better, go ahead and pick up a more languid or cheerful piece.',
    'And, of course, a piano is a beautiful addition to any living room!',
  ],
} as const;
