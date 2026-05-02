// ──────────────────────────────────────────────────────
// 3D Avatar collection – Male & Female categories
// Uses DiceBear 7.x API for SVG avatars
// Each avatar has a unique style + seed combo
// ──────────────────────────────────────────────────────

const DICEBEAR_BASE = 'https://api.dicebear.com/7.x';

/**
 * Build a DiceBear avatar URL.
 * @param {string} style  – one of the DiceBear style names
 * @param {string} seed   – seed string that determines the look
 * @param {object} [opts] – extra query‑string params
 */
export const buildAvatarUrl = (style, seed, opts = {}) => {
    const params = new URLSearchParams({ seed, ...opts });
    return `${DICEBEAR_BASE}/${style}/svg?${params.toString()}`;
};

// ─── Male Avatars ────────────────────────────────────
export const maleAvatars = [
    {
        id: 'm1',
        name: 'Thunder Bolt',
        personality: '⚡ Electric energy',
        url: buildAvatarUrl('adventurer', 'ThunderBolt'),
        style: 'adventurer',
        seed: 'ThunderBolt',
    },
    {
        id: 'm2',
        name: 'Shadow Ninja',
        personality: '🥷 Silent & deadly',
        url: buildAvatarUrl('avataaars', 'ShadowNinja99'),
        style: 'avataaars',
        seed: 'ShadowNinja99',
    },
    {
        id: 'm3',
        name: 'Pixel King',
        personality: '👑 Retro royalty',
        url: buildAvatarUrl('pixel-art', 'PixelKing'),
        style: 'pixel-art',
        seed: 'PixelKing',
    },
    {
        id: 'm4',
        name: 'Robo Max',
        personality: '🤖 Futuristic genius',
        url: buildAvatarUrl('bottts', 'RoboMax'),
        style: 'bottts',
        seed: 'RoboMax',
    },
    {
        id: 'm5',
        name: 'Lava Lord',
        personality: '🌋 Fierce & fiery',
        url: buildAvatarUrl('lorelei', 'LavaLord'),
        style: 'lorelei',
        seed: 'LavaLord',
    },
    {
        id: 'm6',
        name: 'Captain Crunch',
        personality: '🦸 Quiz superhero',
        url: buildAvatarUrl('fun-emoji', 'CaptainCrunch'),
        style: 'fun-emoji',
        seed: 'CaptainCrunch',
    },
    {
        id: 'm7',
        name: 'Ice Breaker',
        personality: '🧊 Cool under pressure',
        url: buildAvatarUrl('notionists', 'IceBreaker'),
        style: 'notionists',
        seed: 'IceBreaker',
    },
    {
        id: 'm8',
        name: 'Turbo Thinker',
        personality: '🧠 Speed + brains',
        url: buildAvatarUrl('personas', 'TurboThinker'),
        style: 'personas',
        seed: 'TurboThinker',
    },
    {
        id: 'm9',
        name: 'Blaze Runner',
        personality: '🔥 Unstoppable force',
        url: buildAvatarUrl('big-smile', 'BlazeRunner'),
        style: 'big-smile',
        seed: 'BlazeRunner',
    },
    {
        id: 'm10',
        name: 'Giga Chad',
        personality: '💪 Ultimate legend',
        url: buildAvatarUrl('thumbs', 'GigaChad'),
        style: 'thumbs',
        seed: 'GigaChad',
    },
    {
        id: 'm11',
        name: 'Cyber Punk',
        personality: '🕶️ Neon rebel',
        url: buildAvatarUrl('adventurer', 'CyberPunk77'),
        style: 'adventurer',
        seed: 'CyberPunk77',
    },
    {
        id: 'm12',
        name: 'Wizard Dude',
        personality: '🧙 Arcane master',
        url: buildAvatarUrl('avataaars', 'WizardDude42'),
        style: 'avataaars',
        seed: 'WizardDude42',
    },
];

// ─── Female Avatars ──────────────────────────────────
export const femaleAvatars = [
    {
        id: 'f1',
        name: 'Star Queen',
        personality: '⭐ Royal brilliance',
        url: buildAvatarUrl('lorelei', 'StarQueen'),
        style: 'lorelei',
        seed: 'StarQueen',
    },
    {
        id: 'f2',
        name: 'Luna Fox',
        personality: '🌙 Mysterious charm',
        url: buildAvatarUrl('adventurer', 'LunaFox'),
        style: 'adventurer',
        seed: 'LunaFox',
    },
    {
        id: 'f3',
        name: 'Neon Kitty',
        personality: '🐱 Electric vibes',
        url: buildAvatarUrl('fun-emoji', 'NeonKitty'),
        style: 'fun-emoji',
        seed: 'NeonKitty',
    },
    {
        id: 'f4',
        name: 'Pixel Princess',
        personality: '👸 8-bit royalty',
        url: buildAvatarUrl('pixel-art', 'PixelPrincess'),
        style: 'pixel-art',
        seed: 'PixelPrincess',
    },
    {
        id: 'f5',
        name: 'Bubble Pop',
        personality: '🫧 Fun & bubbly',
        url: buildAvatarUrl('big-smile', 'BubblePop'),
        style: 'big-smile',
        seed: 'BubblePop',
    },
    {
        id: 'f6',
        name: 'Crimson Blade',
        personality: '⚔️ Warrior spirit',
        url: buildAvatarUrl('avataaars', 'CrimsonBlade77'),
        style: 'avataaars',
        seed: 'CrimsonBlade77',
    },
    {
        id: 'f7',
        name: 'Techno Muse',
        personality: '🎵 Digital artist',
        url: buildAvatarUrl('notionists', 'TechnoMuse'),
        style: 'notionists',
        seed: 'TechnoMuse',
    },
    {
        id: 'f8',
        name: 'Cosmo Girl',
        personality: '🚀 Space explorer',
        url: buildAvatarUrl('personas', 'CosmoGirl'),
        style: 'personas',
        seed: 'CosmoGirl',
    },
    {
        id: 'f9',
        name: 'Robo Diva',
        personality: '🤖 Glamorous AI',
        url: buildAvatarUrl('bottts', 'RoboDiva'),
        style: 'bottts',
        seed: 'RoboDiva',
    },
    {
        id: 'f10',
        name: 'Aurora Bliss',
        personality: '🌈 Colorful soul',
        url: buildAvatarUrl('thumbs', 'AuroraBliss'),
        style: 'thumbs',
        seed: 'AuroraBliss',
    },
    {
        id: 'f11',
        name: 'Frost Fairy',
        personality: '❄️ Icy elegance',
        url: buildAvatarUrl('lorelei', 'FrostFairy'),
        style: 'lorelei',
        seed: 'FrostFairy',
    },
    {
        id: 'f12',
        name: 'Phoenix Rise',
        personality: '🔥 Reborn legend',
        url: buildAvatarUrl('adventurer', 'PhoenixRise'),
        style: 'adventurer',
        seed: 'PhoenixRise',
    },
];

// ─── All avatars combined ────────────────────────────
export const allAvatars = [...maleAvatars, ...femaleAvatars];

/**
 * Find an avatar object by its URL (for reverse‑lookup).
 */
export const findAvatarByUrl = (url) => {
    if (!url) return null;
    return allAvatars.find((a) => a.url === url) || null;
};

/**
 * Get a default avatar for quick assignment.
 */
export const getDefaultAvatar = (gender = 'male') => {
    return gender === 'female' ? femaleAvatars[0] : maleAvatars[0];
};
