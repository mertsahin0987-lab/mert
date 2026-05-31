/**
 * Rule-based description generator for products with missing/thin descriptions.
 *
 * Reads name + brand + category from each product, parses out the structural
 * features (lineup, form factor, power, finish), then composes a short 1-2
 * sentence description focused on what makes this SKU specific rather than
 * generic marketing fluff.
 *
 * Usage:
 *   node --env-file=.env scripts/generate-descriptions.mjs --dry-run   # preview
 *   node --env-file=.env scripts/generate-descriptions.mjs             # apply
 *   node --env-file=.env scripts/generate-descriptions.mjs --sample=15 # show N
 */

import { createClient } from '@supabase/supabase-js';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const sampleArg = argv.find((a) => a.startsWith('--sample='));
const sampleN = sampleArg ? parseInt(sampleArg.split('=')[1], 10) : null;

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// Description composition

/** Parse the colour/finish from the name's tail. */
function extractColour(name) {
  const lower = name.toLowerCase();
  const colours = [
    ['matte black', 'matte black'],
    ['pearl white', 'pearl white'],
    ['matte grey', 'matte grey'],
    ['matte gray', 'matte grey'],
    ['dark teal', 'dark teal'],
    ['black/red', 'black/red'],
    ['green/white', 'green/white'],
    ['camo', 'camo'],
    ['gold', 'gold'],
    ['black', 'black'],
    ['white', 'white'],
    ['silver', 'silver'],
    ['red', 'red'],
    ['green', 'green'],
    ['blue', 'blue'],
    ['pink', 'pink'],
    ['yellow', 'yellow'],
    ['orange', 'orange'],
    ['chrome', 'chrome'],
  ];
  for (const [needle, value] of colours) {
    // Must be a word boundary so "blackout" doesn't match "black"
    const re = new RegExp(`(^|[\\s\\-(])${needle}([\\s\\-)]|$)`, 'i');
    if (re.test(lower)) return value;
  }
  return null;
}

/** Decide form factor with priority: kit > combo > shaver > skeleton trimmer > trimmer > clipper. */
function extractForm(name, category) {
  const lower = name.toLowerCase();
  if (/\bkit\b|\bcollection\b|\bset\b|\bcombo\b|\+\s*(trimmer|clipper|shaver|dryer)/i.test(name)) return 'kit';
  if (/foil shaver|\bshaver\b/i.test(name)) return 'foil-shaver';
  if (/skeleton (fx )?trimmer|skeleton trimmer/i.test(name)) return 'skeleton-trimmer';
  if (category === 'Trimmers' || /\btrimmer\b/i.test(name)) return 'trimmer';
  if (category === 'Clippers' || /\bclipper\b/i.test(name)) return 'clipper';
  if (category === 'Shavers') return 'foil-shaver';
  if (category === 'Sets') return 'kit';
  return category?.toLowerCase()?.replace(/s$/, '') ?? 'tool';
}

const formNoun = {
  'kit': 'set',
  'foil-shaver': 'foil shaver',
  'skeleton-trimmer': 'skeleton trimmer',
  'trimmer': 'trimmer',
  'clipper': 'clipper',
};

/** Per-brand-line opener phrases, keyed by detectable line name. */
function lineOpener(name, brand) {
  const lower = name.toLowerCase();
  const b = brand?.toLowerCase() ?? '';

  // BaByliss Pro lineups
  if (b.includes('babyliss')) {
    if (/fxone/i.test(lower)) return 'Part of the BaByliss Pro FXONE interchangeable-battery system';
    if (/lo-?pro fx/i.test(lower)) return 'BaByliss Pro\'s compact LO-PRO FX form factor';
    if (/super motor/i.test(lower)) return 'BaByliss Pro\'s high-torque Super Motor build';
    if (/boost\+|boosted/i.test(lower)) return 'Boost+ delivers extra cutting power without losing battery life';
    if (/skeleton fx/i.test(lower)) return 'Iconic skeleton-style FX trimmer for outlining and detail';
    if (/chameleon/i.test(lower)) return 'BaByliss Pro Chameleon — colour-shifting finish on a Super Motor build';
    if (/titanium/i.test(lower)) return 'Titanium foil for a closer, more durable shave';
    if (/black fx/i.test(lower)) return 'BaByliss Pro Black FX — matte all-black aesthetic on FX hardware';
    return 'BaByliss Pro professional barber tool';
  }

  // Wahl
  if (b.includes('wahl')) {
    if (/magic clip/i.test(lower)) return 'The legendary 5-Star Magic Clip with stagger-tooth blade';
    if (/senior/i.test(lower)) return 'The iconic Wahl Senior, built for thick-hair fades';
    if (/super taper/i.test(lower)) return 'Workhorse Wahl Super Taper, the barber-shop classic';
    if (/detailer/i.test(lower)) return 'Precision Wahl Detailer for tight outlining';
    if (/legend/i.test(lower)) return 'Wahl 5-Star Legend with a wide cutting blade for blending';
    if (/vanish/i.test(lower)) return 'Wahl Vanish foil shaver for a clean finishing pass';
    if (/sterling/i.test(lower)) return 'Wahl Sterling — reliable salon-grade build';
    return 'Pro-grade Wahl 5-Star series tool';
  }

  // JRL
  if (b.includes('jrl')) {
    if (/diamante/i.test(lower)) return 'JRL Diamante — pro performance with a diamond-cut finish';
    if (/ghost/i.test(lower)) return 'JRL Ghost in translucent white, pro hardware with a unique aesthetic';
    if (/onyx/i.test(lower)) return 'JRL Onyx — matte black finish on the FreshFade chassis';
    if (/freshfade|2020[ct]/i.test(lower)) return 'JRL FreshFade 2020 — long-runtime cordless hardware';
    if (/forte/i.test(lower)) return 'JRL Forte Pro hairdryer with brushless motor';
    return 'JRL professional barber hardware';
  }

  // StyleCraft
  if (b.includes('stylecraft')) {
    if (/saber 2\.0/i.test(lower)) return 'StyleCraft Saber 2.0 with brushless motor and zero-gap blade';
    if (/saber/i.test(lower)) return 'StyleCraft Saber — slim magnetic-motor trimmer';
    if (/instinct/i.test(lower)) return 'StyleCraft Instinct cordless clipper';
    if (/mythic/i.test(lower)) return 'StyleCraft Mythic — magnetic motor on a metal chassis';
    if (/rebel/i.test(lower)) return 'StyleCraft Rebel trimmer for fast outlining';
    if (/evo/i.test(lower)) return 'StyleCraft Evo linear-motor trimmer';
    if (/ergo|x-ergo/i.test(lower)) return 'StyleCraft Ergo — ergonomic cordless build';
    return 'StyleCraft pro tool';
  }

  // Gamma+
  if (b.includes('gamma')) {
    if (/boosted|boost\+/i.test(lower)) return 'Gamma+ Boosted with high-torque rotary motor';
    if (/xcell|xceed/i.test(lower)) return 'Gamma+ XCell/XCeed line — premium magnetic-motor build';
    if (/x-evo/i.test(lower)) return 'Gamma+ X-Evo finishing trimmer';
    if (/evo/i.test(lower)) return 'Gamma+ Evo magnetic-motor trimmer';
    if (/cyborg/i.test(lower)) return 'Gamma+ Cyborg with digital brushless motor';
    if (/hitter/i.test(lower)) return 'Gamma+ Hitter — high-torque cordless trimmer';
    if (/ultimate|dlc/i.test(lower)) return 'Gamma+ Ultimate DLC-coated blade for long-lasting sharpness';
    if (/absolute zero/i.test(lower)) return 'Gamma+ Absolute Zero zero-gap blade kit';
    return 'Gamma+ pro tool';
  }

  // Cocco
  if (b.includes('cocco')) {
    if (/hyper veloce/i.test(lower)) return 'Cocco Hyper Veloce Pro — high-RPM rotary motor in a premium chassis';
    if (/veloce lite/i.test(lower)) return 'Cocco Veloce Lite — lighter chassis at a more accessible price';
    if (/veloce pro/i.test(lower)) return 'Cocco Veloce Pro with magnetic motor and zero-gap blade';
    return 'Cocco pro-line tool';
  }

  // Supreme Trimmer
  if (b.includes('supreme')) {
    if (/darkstar/i.test(lower)) return 'Supreme Trimmer DarkStar — high-RPM clipper for fast fades';
    if (/2spee|t shaper|tshaper/i.test(lower)) return 'Supreme Trimmer T-Shaper for outlining and details';
    if (/vader/i.test(lower)) return 'Supreme Trimmer Vader cordless liner';
    if (/testii/i.test(lower)) return 'Supreme Trimmer TESTii — body and groin grooming';
    if (/solo/i.test(lower)) return 'Supreme Trimmer Solo single-foil pocket shaver';
    if (/prodigy/i.test(lower)) return 'Supreme Trimmer Prodigy — affordable pro-level performance';
    return 'Supreme Trimmer pro tool';
  }

  // Andis
  if (b.includes('andis')) {
    if (/phenom/i.test(lower)) return 'Andis Phenom brushless rotary-motor trimmer';
    if (/gtx-?exo/i.test(lower)) return 'Andis GTX-EXO cordless trimmer for tight detailing';
    if (/gtx-?z/i.test(lower)) return 'Andis GTX-Z slim zero-gapped trimmer';
    if (/supra/i.test(lower)) return 'Andis Supra Li-5 detachable-blade clipper';
    if (/easystyle|easy ?style/i.test(lower)) return 'Andis EasyStyle adjustable-blade clipper';
    if (/proalloy/i.test(lower)) return 'Andis ProAlloy Fade — alloy-housing fade clipper';
    return 'Andis pro barber hardware';
  }

  // TPOB
  if (b.includes('tpob')) {
    if (/yeti/i.test(lower)) return 'TPOB Yeti — brushless clipper with custom barber styling';
    if (/ghost x/i.test(lower)) return 'TPOB Ghost X trimmer with custom-finish chassis';
    if (/x trimmer/i.test(lower)) return 'TPOB X Trimmer — Deluxe finish on a pro-grade build';
    return 'TPOB barber-style tool';
  }

  if (b.includes('panasonic')) return 'Panasonic professional barber hardware';
  if (b.includes('heiniger')) return 'Heiniger pro-grade clipping tool';
  if (b.includes('artero')) return 'Artero professional barber tool';
  if (b.includes('omni')) return 'OMNI cordless barber tool';
  if (b.includes('barberstyle')) return 'BarberStyle pro barber tool';
  if (b.includes('kiepe')) return 'Kiepe Professional pro tool';
  if (b.includes('caliber')) return 'Caliber pro barber tool';
  if (b.includes('tomb45')) return 'Tomb45 wireless-charging accessory';

  return `${brand ?? 'Professional'} barber tool`;
}

/** Whether the opener already conveys the product's purpose/role. */
function openerCoversPurpose(opener) {
  // Form words + descriptors of quality/build — when any of these are present,
  // appending a generic "Pro barber-shop performance" tail is filler.
  return /outlin|detail|fade|cut\b|shave|blend|trimmer|clipper|kit|set|shaver|trim|design|grooming|motor|chassis|build|hardware|tool|accessory|brushless|rotary|magnetic|dryer/i.test(
    opener,
  );
}

/** Hardware feature inferences from the name. Returns null when nothing new to add. */
function featureTail(name, form, opener) {
  const lower = name.toLowerCase();
  const bits = [];

  if (/cordless/i.test(lower) && !/cordless/i.test(opener)) bits.push('Cordless');
  if (/brushless/i.test(lower) && !/brushless/i.test(opener)) bits.push('brushless motor');
  if (/magnetic motor|magnetic-motor/i.test(lower) && !/magnetic/i.test(opener)) bits.push('magnetic motor');
  if (/zero[- ]?gap/i.test(lower) && !/zero-gap/i.test(opener)) bits.push('zero-gap blade');
  if (/dlc/i.test(lower) && !/dlc/i.test(opener)) bits.push('DLC-coated blade');
  if (/titanium/i.test(lower) && !/titanium/i.test(opener)) bits.push('titanium foil');

  if (bits.length > 0) return bits.join(', ');

  // No hardware features added. Only add a generic purpose phrase when the
  // opener is bland — i.e. didn't already say "trimmer/clipper/shave/etc.".
  if (openerCoversPurpose(opener)) return null;

  if (form === 'foil-shaver') return 'Clean finishing shave';
  if (form === 'skeleton-trimmer') return 'Exposed-blade detail work';
  if (form === 'kit') return 'Full barber set in one box';
  if (form === 'trimmer') return 'Precision outlining and detail work';
  if (form === 'clipper') return 'Pro barber-shop performance';
  return null;
}

function colourClause(colour, form) {
  if (!colour) return '';
  const noun = formNoun[form] ?? 'tool';
  return ` Finished in ${colour}.`;
}

function compose(name, brand, category) {
  const opener = lineOpener(name, brand);
  const form = extractForm(name, category);
  const features = featureTail(name, form, opener);
  const colour = extractColour(name);

  // Don't mention colour for kits/bundles
  const colourPart = (form === 'kit') ? '' : colourClause(colour, form);
  const featurePart = features ? `. ${features.charAt(0).toUpperCase() + features.slice(1)}.` : '.';

  let out = `${opener}${featurePart}${colourPart}`.replace(/\s+/g, ' ').trim();
  out = out.replace(/\.\./g, '.');
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main

const { data: products, error } = await sb
  .from('products')
  .select('id, name, category, description, brands(name)');
if (error) { console.error(error); process.exit(1); }

const thin = products.filter(
  (p) => !p.description || p.description.length < 30,
);
console.log(`${thin.length} products need descriptions.\n`);

const rows = thin.map((p) => ({
  id: p.id,
  name: p.name,
  brand: p.brands?.name,
  desc: compose(p.name, p.brands?.name, p.category),
}));

if (sampleN !== null) {
  // Show a diverse sample — pick from different brands
  const seen = new Set();
  const picked = [];
  for (const r of rows) {
    if (picked.length >= sampleN) break;
    if (seen.has(r.brand)) continue;
    seen.add(r.brand);
    picked.push(r);
  }
  // Fill remaining slots with whatever's left
  for (const r of rows) {
    if (picked.length >= sampleN) break;
    if (!picked.includes(r)) picked.push(r);
  }
  for (const r of picked) {
    console.log(`#${r.id} [${r.brand}] ${r.name}`);
    console.log(`  → ${r.desc}\n`);
  }
  process.exit(0);
}

if (dryRun) {
  for (const r of rows) {
    console.log(`#${r.id} [${r.brand}] ${r.name}\n  → ${r.desc}\n`);
  }
  console.log(`\n(dry-run) ${rows.length} descriptions composed.`);
  process.exit(0);
}

// Apply
let ok = 0, fail = 0;
for (const r of rows) {
  const u = await sb.from('products').update({ description: r.desc }).eq('id', r.id);
  if (u.error) { fail++; console.error('  ✗', r.id, u.error.message); }
  else ok++;
}
console.log(`\n✓ Updated ${ok} descriptions${fail ? ` (${fail} failed)` : ''}.`);
