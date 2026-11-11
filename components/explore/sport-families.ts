/**
 * Sports grouped into families for the Interests picker.
 *
 * The `sports` table is flat (its `parent_id` links point at nothing), so 86
 * names were one alphabetical wall. These families are a display grouping only:
 * nothing is stored by family, and a sport missing from the map lands in
 * "Other", so a new sport in the database still shows up.
 */
export const SPORT_FAMILIES: { name: string; sports: string[] }[] = [
	{ name: 'Team sports', sports: ['American Football', 'Aussie Rules Football', 'Baseball', 'Basketball', 'Cricket', 'Dodgeball', 'Football / Soccer', 'Handball', 'Hockey', 'Ice Hockey', 'Kabaddi', 'Kickball', 'Korfball', 'Lacrosse', 'Netball', 'Rugby', 'Softball', 'Ultimate Frisbee', 'Volleyball'] },
	{ name: 'Racket sports', sports: ['Badminton', 'Beach Tennis', 'Padel', 'Pickleball', 'Squash', 'Table Tennis', 'Tennis'] },
	{ name: 'Combat sports', sports: ['Boxing', 'Chessboxing', 'Combat Sports', 'Fencing', 'Judo', 'Karate', 'Martial Arts', 'Mixed Martial Arts', 'Muay Thai', 'Wrestling'] },
	{ name: 'Fitness & endurance', sports: ['Athletics', 'Dance', 'Fitness & Workout', 'Multisport', 'Running', 'Strength', 'Yoga'] },
	{ name: 'Wheels & motor', sports: ['Bmx', 'Cycling', 'Drone Sports', 'Motocross', 'Motorsports', 'Mountain Biking', 'Racing', 'Skateboarding'] },
	{ name: 'Water sports', sports: ['Bodyboarding', 'Fishing', 'Kayaking', 'Rowing', 'Sailing', 'Surfing', 'Swimming', 'Water Sports Others', 'Wing Boarding'] },
	{ name: 'Winter sports', sports: ['Curling', 'Skiing', 'Snowboarding', 'Winter Sports Others'] },
	{ name: 'Outdoor & adventure', sports: ['Hiking', 'Hunting', 'Mountaineering', 'Paragliding', 'Parkour', 'Rock Climbing', 'Skydiving'] },
	{ name: 'Precision & target', sports: ['Archery', 'Axe Throwing', 'Billiards', 'Bowling', 'Darts', 'Disc Golf', 'Golf', 'Pool & Snooker', 'Shooting'] },
	{ name: 'Equestrian', sports: ['Equestrian', 'Horse Racing', 'Horse Riding'] },
	{ name: 'Mind & gaming', sports: ['Chess', 'Esports', 'Gaming'] },
];

/** Shown before "Show all sports": the ones most people come for. */
export const POPULAR_SPORTS = ['Football / Soccer', 'Basketball', 'American Football', 'Tennis', 'Golf', 'Cricket', 'Running', 'Cycling', 'Motorsports', 'Esports'];

/** Display fixes for names stored in the wrong case. */
const DISPLAY: Record<string, string> = { Bmx: 'BMX' };
export const sportLabel = (name: string) => DISPLAY[name] ?? name;
