/**
 * seed-library-lib.cjs
 *
 * Single source of truth for Library seed content.
 * Required by both apply-schema.js (auto-seeds on deploy) and
 * scripts/seed-library.js (manual / one-shot CLI seed).
 *
 * CRITICAL: No source titles, author names, book references, or framework names
 * appear in this file. Content is synthesised from source material; the
 * user-facing app never references the sources. See FR-002 in spec.md.
 */

"use strict";

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_DATA = [
  // ── TENNIS ─────────────────────────────────────────────────────────────────
  {
    slug: "tennis", title: "Tennis", icon: "Volleyball",
    description: "Stroke mechanics, physical conditioning, mental game, and match tactics for the recreational player.",
    categories: [
      {
        title: "Stroke Mechanics",
        items: [
          {
            title: "The Kinetic Chain", type: "concept",
            what: "Every tennis stroke is powered by a chain of body segments transferring force from the ground upward: feet, ankles, calves, knees, quads, hips, core, shoulder, arm, wrist, racket.",
            why: "If any link in the chain is weak or stiff, the chain breaks and the segments above it must compensate — which is how injuries happen and why shots lose power even when your arm feels strong.",
            how: "In every drill, consciously initiate movement from your feet pushing against the court, not from your arm. Feel the sequence travel upward. Three links most often neglected: hips (the engine of rotation), core (the transfer station), and posterior shoulder (the braking system that decelerates your arm after every stroke).",
          },
          {
            title: "Forehand Mechanics", type: "concept",
            what: "The forehand is the most rotational groundstroke. The open-stance forehand dominates at every level because it allows maximum hip and trunk rotation.",
            why: "The muscles that decelerate the forehand (posterior shoulder, upper back) work harder eccentrically than the accelerating muscles work concentrically. This is why shoulder injuries come from weak decelerators, not weak accelerators.",
            how: "Backswing: load lower body eccentrically and rotate trunk, letting the shoulder and arm externally rotate. Forward swing: drive with lower body first, rotate trunk, let arm follow. Follow-through: allow the arm to decelerate fully across the body — do not block the finish.",
          },
          {
            title: "Posterior Shoulder Deceleration", type: "concept",
            what: "The muscles at the back of the shoulder must absorb all the rotational velocity generated during each stroke's acceleration phase.",
            why: "Shoulder internal rotation during the serve reaches over 1,000 degrees per second. Those same muscles must reverse that force eccentrically on every single stroke. A weak posterior shoulder chain is the leading cause of shoulder injuries in recreational players.",
            how: "Train these muscles with external rotation exercises and reverse flys. During play, never block your follow-through — letting the arm swing fully through is what allows the posterior chain to decelerate the load gradually rather than abruptly.",
          },
          {
            title: "Serve Load Mechanics", type: "concept",
            what: "The serve requires the highest shoulder rotation speed of any tennis stroke, generating internal rotation speeds between 1,000 and 2,300 degrees per second at ball contact.",
            why: "A full match involves hundreds of serves. The cumulative eccentric load on the posterior shoulder and rotator cuff is extreme. Understanding this explains why shoulder prehab is non-negotiable, not optional.",
            how: "Load the trophy position by externally rotating the shoulder and opening the chest fully. Drive through with legs and hip rotation before the arm accelerates. After contact, let the arm swing across the body naturally.",
          },
          {
            title: "One-Handed Backhand Chain", type: "concept",
            what: "The one-handed backhand requires shoulder external rotation and trunk rotation to work precisely together, with minimal compensation possible.",
            why: "Unlike the forehand, the dominant arm is behind the body at contact, so the shoulder must externally rotate further and the trunk must contribute more. Weakness in either overtaxes the elbow and shoulder.",
            how: "At the backswing peak, the hitting shoulder should be clearly higher than the non-hitting shoulder. Drive forward by rotating the trunk first, then extend the arm through contact. Follow through high and across, pointing the racket tip toward the target.",
          },
        ],
      },
      {
        title: "Physical Conditioning",
        items: [
          {
            title: "Eccentric Calf Raises", type: "exercise",
            what: "A calf strengthening exercise performed by raising on both feet and lowering slowly on one foot, targeting the gastrocnemius and soleus eccentrically.",
            why: "Tennis requires explosive lateral movement, split-steps, and rapid direction changes — all placing high eccentric demand on the calf and Achilles. Regular eccentric loading is the most evidence-supported method for preventing Achilles tendinopathy.",
            how: "Stand on a step with heels hanging off the edge. Rise on both feet (concentric), transfer weight to the working leg, then lower slowly over 3 seconds (eccentric). Perform both straight-leg (targets gastrocnemius) and bent-knee (targets soleus) variations.",
            durationOrReps: "3 sets x 12 reps each leg, twice weekly",
          },
          {
            title: "Lateral Band Walks", type: "exercise",
            what: "A resistance band exercise where you step sideways against band tension, activating the hip abductors and glutes in the lateral movement pattern tennis demands most.",
            why: "60 to 80 percent of movement in tennis is lateral. Weak hip abductors force the knee to collapse inward on every split-step and direction change, increasing injury risk and reducing push-off power.",
            how: "Place a resistance band around your ankles or just above the knees. Stand in an athletic position (slight hip hinge, soft knees). Step sideways with controlled tension — do not let the feet come closer than shoulder width. Keep the band taut throughout. Take 10 steps in each direction per set.",
            durationOrReps: "3 sets x 10 steps each direction",
          },
          {
            title: "External Shoulder Rotation with Band", type: "exercise",
            what: "An isolation exercise for the rotator cuff's external rotators, performed with a resistance band anchored at elbow height.",
            why: "Tennis creates a significant imbalance between internal rotators (accelerators) and external rotators (decelerators). Without active training of the external rotators, the posterior shoulder weakens relative to the front, leading to impingement and rotator cuff injuries.",
            how: "Stand with the band anchored to the side at elbow height. Keep the elbow bent at 90 degrees and pinned to your side. Rotate the forearm outward against band resistance, moving through full comfortable range. Return slowly. Perform on both arms.",
            durationOrReps: "3 sets x 15 reps each arm",
          },
          {
            title: "Split-Step Timing", type: "tip",
            what: "The split-step is a small hop landing on both feet simultaneously, timed to the moment your opponent makes contact with the ball.",
            why: "A well-timed split-step loads your legs eccentrically at the moment you need to react, allowing a faster explosive first step in any direction. A split-step that is too early or too late eliminates this advantage.",
            how: "Watch your opponent's racket, not the ball. Begin the hop as their swing starts its forward movement. Land softly on the balls of both feet simultaneously as they make contact. From this athletic position your first step should feel almost automatic.",
          },
          {
            title: "Core Rotation Strength", type: "protocol",
            what: "A targeted training protocol for the obliques, transverse abdominis, and erector spinae working together to transfer force between the lower and upper body during groundstrokes.",
            why: "The core is the transfer station in the kinetic chain. A leaky transfer station means the legs generate power that never reaches the racket.",
            how: "Perform three exercises in sequence: (1) Pallof press — anchor a band at chest height, press straight out and hold for 2 seconds, 3 sets x 10 each side. (2) Med ball rotational slam against a wall, 3 sets x 8 each side. (3) Side plank with hip dip, 3 sets x 12 each side.",
            durationOrReps: "3 exercises, 3 sets each",
          },
        ],
      },
      {
        title: "Mental Game",
        items: [
          {
            title: "Nonjudgmental Awareness", type: "tip",
            what: "The practice of observing what happens during a point without labelling it as good or bad — noticing where the ball goes and what the body did, without emotional attachment to the outcome.",
            why: "Self-criticism and praise both pull conscious attention away from the task. The internal narrator that says 'terrible' or 'great' is the same voice that causes double faults.",
            how: "After each point, say one factual observation to yourself: 'The forehand went wide. I was late rotating my hips.' That is all. Not 'I always miss that shot.' One factual observation, then reset for the next point.",
          },
          {
            title: "Pre-Point Ritual", type: "protocol",
            what: "A fixed 3-step sequence performed between every point to create a consistent mental and physical state before the next point begins.",
            why: "Consistent rituals interrupt emotional carry-over from the previous point and create a reliable transition back to a ready state. Players with consistent between-point routines recover from errors faster.",
            how: "Design your ritual with three steps: (1) physical reset — turn away from the court and take one breath, (2) tactical thought — decide on one clear intention for the next point, (3) ready position — establish your service or return position with focus. Use exactly the same sequence every time.",
          },
          {
            title: "Tactical Focus Point", type: "protocol",
            what: "Selecting one specific tactical intention before a match and maintaining it throughout, rather than reacting to each situation without a plan.",
            why: "A single clear intention simplifies decision-making under pressure. Players who play without a tactical framework make reactive decisions — which are slower, less consistent, and more affected by nerves.",
            how: "Before the warm-up, choose one tactical focus: for example, 'play every ball to the opponent's backhand' or 'come to the net after every short ball.' Stick to it for the first set regardless of score. Evaluate at the changeover and adjust if needed.",
          },
          {
            title: "Relaxation Breath Between Points", type: "protocol",
            what: "A deliberate breathing technique used between points to lower heart rate, reduce muscle tension, and reset the nervous system before the next point.",
            why: "Heart rate elevates sharply during points and does not recover fully between short points without intervention. One controlled breath can reduce heart rate meaningfully within 15 seconds.",
            how: "After the point ends, inhale through the nose for 4 seconds, exhale through the mouth for 6 seconds. The longer exhale activates the parasympathetic nervous system. Do this before your pre-point ritual, as the first act of the transition.",
          },
        ],
      },
      {
        title: "Match Tactics",
        items: [
          {
            title: "Serve Plus One Pattern", type: "tip",
            what: "A tactical pattern where you plan both the serve placement and the first groundstroke as a unit, rather than serving and then reacting.",
            why: "The point after the serve return is the most controllable moment in tennis. You know where you served, so you can predict the likely return zone and prepare a specific second shot.",
            how: "For each first serve, plan the follow-up: if you serve wide to the deuce court, plan to hit the next ball to the open court. If you serve into the body, plan to attack the short return down the middle. Drill these patterns explicitly so they become automatic.",
          },
          {
            title: "Approach Shot to Weakness", type: "tip",
            what: "When a short ball allows you to approach the net, directing the approach shot to the opponent's weaker side forces them to attempt a passing shot from their weakest groundstroke.",
            why: "An approach shot to the opponent's strength gives them a comfortable passing shot. Approaching to the weakness puts them under dual pressure: hit their weaker shot under time pressure.",
            how: "Identify the opponent's weaker side in the first two games. Every approach goes there. Aim cross-court to keep the ball low through the net's lowest point, and approach with depth.",
          },
          {
            title: "Net Coverage After Approach", type: "protocol",
            what: "A footwork sequence for closing to the net efficiently after an approach shot: hit the approach, take two steps toward the net, then split-step as the opponent winds up to hit.",
            why: "Players who stand still near the service line after an approach are in the worst position: too far from the baseline to recover, too far from the net to volley effectively.",
            how: "After contact on the approach: (1) take two controlled recovery steps toward the net. (2) Read the opponent's body language and racket. (3) Split-step as their racket starts forward. (4) React to the passing shot direction from a loaded, balanced position.",
          },
          {
            title: "Reading Return Position", type: "tip",
            what: "Watching where the returning player stands at the baseline to determine the serve placement that creates the most space.",
            why: "A returner who crowds the center gives you the angle down the T on either side. A returner who stands wide gives you the body serve. Most recreational players stand in predictable positions every point.",
            how: "At the moment you bounce the ball before serving, glance at where the returner is standing. If they are on or past the center mark, serve wide. If they are standing wide, serve into the body or down the T.",
          },
        ],
      },
    ],
  },

  // ── CLIMBING ───────────────────────────────────────────────────────────────
  {
    slug: "climbing", title: "Climbing", icon: "Mountain",
    description: "Technique, strength training, mental skills, and injury prevention for boulderers and sport climbers.",
    categories: [
      {
        title: "Technique and Movement",
        items: [
          {
            title: "Silent Feet", type: "exercise",
            what: "A technique drill where you place each foot on a hold with zero audible contact — no scraping, no tapping, no adjusting after placement.",
            why: "Noisy feet reveal sloppy footwork. Precise footwork transfers weight onto the feet rather than the hands, reduces pump, and opens up body positions that arm strength alone cannot reach.",
            how: "Choose a route at two grades below your max. Before each foot placement, pause and visually target the exact point on the hold where your foot will land. Place it once, precisely. If you hear sound, reset and place again. Climb at half speed.",
            durationOrReps: "15 min per session at easy grade",
          },
          {
            title: "Hip Positioning", type: "tip",
            what: "Keeping your hips close to the wall and rotating them into each reach, rather than letting them swing away from the rock.",
            why: "Hips away from the wall forces the upper body to pull horizontally rather than upward, multiplying the load on the fingers and arms enormously. Hips close to the wall shifts load onto the skeleton and feet.",
            how: "On each move, ask: where are my hips? On steep terrain, use drop-knee and flag positions to pull one hip into the wall. On slabs, press the hip closest to the wall against the surface. On vertical routes, rotate the hip toward your reaching arm on each move.",
          },
          {
            title: "Route Reading", type: "protocol",
            what: "The practice of studying a route or boulder problem from the ground before touching the wall, planning the sequence, rest positions, and key moves.",
            why: "Attempting a route without reading it burns energy and mental bandwidth on figuring out sequences while already tired. Route reading front-loads the thinking and frees the body to execute.",
            how: "Stand below the route for at least 30 seconds. Identify: (1) the rest positions — where can you shake out and recover? (2) the crux — the hardest move or sequence. (3) the clipping positions — where and from which hand? Walk through the sequence in your head before your feet leave the ground.",
          },
          {
            title: "Slow-Motion Climbing", type: "exercise",
            what: "Climbing at half normal speed, with exaggerated deliberate body positions, to expose movement weaknesses that disappear at normal pace.",
            why: "At normal speed, momentum and habit mask inefficiencies. Slow-motion climbing removes momentum and forces you to feel where your weight is at every moment.",
            how: "Choose an easy route or traverse. Set a pace where each move takes twice as long as normal. At each position, pause for one full breath and notice: where is your weight? Is it on your feet or your hands? Can you take one hand off the wall right now?",
            durationOrReps: "15 min per session",
          },
          {
            title: "Shake-Out on Rest Holds", type: "protocol",
            what: "A technique for actively recovering forearm blood flow at a rest hold by dropping one arm below hip level, shaking it gently, and breathing out fully before switching arms.",
            why: "Forearms recover through blood flow, not just relaxation. An arm hanging at or above shoulder height has reduced blood flow due to hydrostatic pressure. Dropping below the hip significantly improves circulation.",
            how: "At a rest hold: (1) Drop one arm completely below hip level. (2) Shake gently. (3) Breathe out fully. (4) Count to 10. (5) Switch arms and repeat. Only leave the rest hold when both arms feel meaningfully recovered.",
          },
          {
            title: "Traversing for Endurance", type: "exercise",
            what: "Continuous lateral movement along the wall at a moderate grade, without stepping off, used to build forearm endurance and footwork simultaneously.",
            why: "Traversing maintains a consistent moderate pump over a sustained period — exactly the physiological stimulus needed to develop aerobic forearm capacity.",
            how: "Find a section of the wall at a grade where you can climb continuously without falling. Traverse back and forth for the target duration without stepping off. When the pump builds to a 6 out of 10, practice shaking out on whatever holds are available.",
            durationOrReps: "5-10 min continuous at end of session",
          },
        ],
      },
      {
        title: "Strength Training",
        items: [
          {
            title: "4x4 Interval Protocol", type: "protocol",
            what: "An anaerobic endurance training method where you climb four boulder problems back-to-back without rest, rest 4 minutes, and repeat 4 times.",
            why: "4x4s train your body to tolerate rising lactic acid while continuing to climb — directly simulating the physiological demands of redpointing a route.",
            how: "Choose four boulder problems at 2 to 3 grades below your max. Climb all four back-to-back without touching the ground. Rest exactly 4 minutes. Repeat 4 times. If you complete all 4 sets cleanly, the problems are too easy — move up.",
            durationOrReps: "4 sets x 4 problems, 4 min rest between sets",
          },
          {
            title: "Fingerboard Repeaters", type: "protocol",
            what: "A structured fingerboard training method using repeated hang and rest intervals at submaximal intensity to build finger tendon capacity.",
            why: "Repeaters build finger strength through tendon adaptation, which takes months longer than muscle adaptation. Consistent low-intensity finger training produces more durable gains than infrequent max-effort sessions.",
            how: "Choose a hold at which you can hang for 7 seconds with difficulty but not failure. Perform 6 repeating cycles: hang 7 seconds, rest 3 seconds. Rest 3 minutes. Repeat for 4 to 5 grip positions. Use an open-hand grip. Never do this if you feel any finger tendon soreness.",
            durationOrReps: "5 grips x 6 hangs x 7 sec, 3 min rest between grips",
          },
          {
            title: "Weighted Pull-Ups", type: "exercise",
            what: "Pull-ups performed with additional weight via a weight belt or vest, targeting upper back, biceps, and shoulder retractors under high load.",
            why: "Body-weight pull-ups become insufficient stimulus once you can do 10 or more with good form. Adding weight maintains progressive overload and builds the pulling strength required for steep climbing.",
            how: "Attach weight via a weight belt. Pull up until chin clears the bar, with full shoulder engagement at the top. Lower slowly over 2 to 3 seconds. Stop the set when form breaks. Add weight when you can complete 8 clean reps. Rest 3 minutes between sets.",
            durationOrReps: "3 sets x 5-8 reps, 3 min rest",
          },
          {
            title: "Lock-Off and Frenchies", type: "exercise",
            what: "A pull-up variation that adds isometric lock-off holds at three arm angles: full lock (chin at bar), 90 degrees, and 120 degrees.",
            why: "Climbing requires generating and sustaining force at partial arm angles. Frenchies build static strength at the specific angles used during hard moves.",
            how: "Pull up to full lock (chin at bar), hold 5 seconds. Lower to 90 degrees, hold 5 seconds. Lower to 120 degrees, hold 5 seconds. Lower fully. That is one rep. Rest 5 minutes between sets.",
            durationOrReps: "3 sets, 5 min rest between sets",
          },
          {
            title: "Antagonist Work", type: "protocol",
            what: "A set of pushing and extending exercises performed to counterbalance the pulling-dominant loads of climbing and prevent muscular imbalances.",
            why: "Climbing creates a heavily imbalanced load ratio. Without active counterbalancing, this imbalance is the primary cause of shoulder impingement, golfer's elbow, and finger pulley stress.",
            how: "Perform after every climbing session: push-ups 3x15, reverse flys with a band 3x12, external shoulder rotations with a band 3x15 each arm, reverse wrist curls 3x20. Skipping these on high-volume sessions is when the imbalance causes the most damage.",
            durationOrReps: "4 exercises, 3 sets each, after every session",
          },
          {
            title: "Beginner Negative Pull-Ups", type: "exercise",
            what: "Slow-lowering pull-up negatives for climbers who cannot yet perform 5 clean pull-ups, targeting the same muscles through eccentric loading.",
            why: "Eccentric strength develops faster than concentric strength in beginners. Slow-lowering negatives allow you to train the full pulling muscle chain at a load you can control.",
            how: "Use a chair or jump to reach the top position (chin above bar). Lower yourself as slowly as possible — aim for 3 to 5 seconds on the way down. Step back up or jump again for the next rep. Progress to assisted pull-ups once you can reliably lower in 4 seconds.",
            durationOrReps: "3 sets x 5 reps",
          },
        ],
      },
      {
        title: "Mental Training",
        items: [
          {
            title: "Pre-Climb Visualisation Ritual", type: "protocol",
            what: "A fixed mental preparation sequence performed before every serious climbing attempt: chalk up, visualise the sequence move by move, take one deep breath and exhale, then climb.",
            why: "A consistent ritual shifts the brain from analytical thinking into execution mode. When the ritual becomes automatic, the conscious mind is occupied with the steps rather than with fear or doubt.",
            how: "Before every hard attempt: (1) chalk up deliberately. (2) Close eyes and visualise the sequence — the holds, the body positions, the feeling of sticking the crux. (3) Open eyes, take one full breath, exhale completely. (4) Climb. Use exactly this sequence every time, no exceptions.",
          },
          {
            title: "Energy-Emotion Tracking", type: "protocol",
            what: "Recording your energy level and emotional state at the start of each climbing session using two simple scales: Energy 0 to 10, Emotion -5 to +5.",
            why: "Over weeks of tracking, patterns emerge showing which conditions produce your best sessions and which kill your motivation. The patterns that emerge are actionable.",
            how: "Before each session, write: date, energy (0-10), emotion (-5 to +5). After the session, note how it went in one sentence. After 6 to 8 sessions, review. What scores correlate with your best performance? Adjust your training schedule accordingly.",
          },
          {
            title: "Nonjudgmental Performance Review", type: "tip",
            what: "Separating your self-image from your climbing performance by treating failures as data points rather than as statements about your identity or ability.",
            why: "Self-criticism after a fall is habitual and feels honest, but it is not useful. 'I fell on move 7 because my foot slipped' is actionable. 'I am weak' is not.",
            how: "When you fall, say one factual observation to yourself: 'Foot slipped on the crimp. Next attempt, place the right foot first and weight it before reaching.' That is the review. Move on to the next attempt without elaboration.",
          },
          {
            title: "Positive Self-Talk Under Pump", type: "tip",
            what: "Replacing the brain's default 'I'm about to fall' signal when pumped with a short directive phrase that keeps the body moving.",
            why: "The feeling of pump triggers a fear response causing gripping harder, holding the breath, and stopping movement. Each of these makes the pump worse. A brief directive phrase interrupts the fear loop.",
            how: "Choose your phrase in advance: something short and directive like 'Breathe. Feet. Next hold.' When the pump hits, say it internally and execute the directive. Practice deliberately climbing through pump without stopping in training.",
          },
          {
            title: "Body Scan for Tension", type: "protocol",
            what: "A rapid scan for unnecessary muscular tension performed at every rest position before a crux move.",
            why: "Excess tension costs energy and reduces movement precision. Climbers routinely hold tension in the jaw, shoulders, and grip hand without awareness.",
            how: "At each rest hold, scan in 2 seconds: jaw clenched? Relax it. Shoulders raised? Drop them. Gripping harder than necessary? Release by one notch. Holding breath? Exhale. Ask: am I holding tension that is not actively keeping me on the wall? If yes, release it.",
          },
        ],
      },
      {
        title: "Injury Prevention",
        items: [
          {
            title: "A2 Pulley Tape — X Method", type: "protocol",
            what: "A prophylactic taping method for the A2 finger pulley using athletic tape in an X pattern over the proximal finger joint.",
            why: "The A2 pulley is under extreme stress during crimp-grip positions and is the most commonly injured pulley in climbing. Taping provides external mechanical support during hard sessions.",
            how: "Use 1.25cm athletic tape. Wrap once around the finger just distal to the proximal joint. Apply two strips in an X pattern over the A2 location. Secure with a final wrap. The tape should feel supportive without restricting circulation. Apply before hard sessions on crimpy routes and always when any finger tenderness is present.",
          },
          {
            title: "Open-Hand Grip Rule", type: "tip",
            what: "Using an open-hand grip (fingers slightly curved, not fully crimped) as the default grip position, reserving full crimping for holds where it is unavoidable.",
            why: "Full crimp positions place significantly higher load on the A2 pulley than open-hand grip. Most climbers who develop pulley injuries do so on holds where open-hand was actually possible — they crimped out of habit.",
            how: "In every session, default to open hand. Before grabbing a hold, consciously uncurl your hand slightly. If the hold is large enough for open hand, use it. Reserve the full crimp for tiny crimpers where contact area genuinely requires it.",
          },
          {
            title: "Antagonist Imbalance", type: "concept",
            what: "The structural muscular imbalance that develops in climbers because pulling muscles are trained repeatedly while pushing and extending muscles receive minimal stimulus.",
            why: "Unchecked, this imbalance progresses from minor tightness to shoulder impingement, golfer's elbow, and finger tendon stress. The pulling-to-pushing load ratio in a typical climbing session can exceed 10 to 1.",
            how: "This requires permanent counterbalancing, not a phase of correction. The antagonist work protocol (push-ups, reverse flys, external rotations, wrist extensions) must be performed after every session throughout the training year.",
          },
          {
            title: "When Not to Use the Fingerboard", type: "tip",
            what: "A set of conditions under which fingerboard training must not occur, regardless of motivation or how strong you feel.",
            why: "Finger tendons adapt 2 to 3 times more slowly than muscle. It takes approximately 1 to 2 years of climbing before the tendons can handle isolated fingerboard loading safely.",
            how: "Do not use a fingerboard if: you have been climbing for fewer than 2 years, you climb below V3 or 5.10, you feel any finger soreness at the start of the session, or you have not built consistent antagonist work into your routine.",
          },
          {
            title: "Shoulder Prehab Routine", type: "protocol",
            what: "A short routine targeting the rotator cuff's external rotators and scapular stabilisers to maintain shoulder health during climbing training.",
            why: "Climbing's pulling load overdevelops the internal rotators and front of the shoulder. Without active intervention, the rotator cuff's posterior muscles become relatively weaker each session.",
            how: "3 times per week: (1) Band external rotations — elbow at 90 degrees, rotate outward against resistance, 3x15 each arm. (2) Band pull-aparts — hold band at chest height, pull apart to full spread, 3x15. (3) Reverse flys — bent over, raise arms to shoulder height with a pause at the top, 3x12.",
            durationOrReps: "3 exercises, 3 sets each, 3x per week",
          },
          {
            title: "Back Support Core Work", type: "protocol",
            what: "Anti-extension core exercises specifically chosen for climbers with thoracic kyphosis or back sensitivity, building the spinal support system that steep climbing demands.",
            why: "Climbing on steep terrain creates significant spinal loading. For climbers with back issues, the supporting muscles of the spine must compensate for structural limitations. Core stability is structural, not optional.",
            how: "Twice per week: (1) Dead bugs — extend opposite arm and leg while maintaining a flat lower back, 3x10 each side. (2) Bird dogs — on hands and knees, extend opposite arm and leg, 3x10 each side. (3) Front plank, 3x45 seconds. (4) Thoracic foam roller extensions, 10 slow passes.",
            durationOrReps: "4 exercises, twice weekly",
          },
        ],
      },
    ],
  },

  // ── RUNNING ────────────────────────────────────────────────────────────────
  {
    slug: "running", title: "Running", icon: "Footprints",
    description: "Training principles, physiology, form cues, and injury prevention for consistent, long-term running.",
    categories: [
      {
        title: "Training Principles",
        items: [
          {
            title: "The 80/20 Intensity Rule", type: "concept",
            what: "Running approximately 80 percent of weekly volume at easy, conversational pace and only 20 percent at moderate or hard intensity.",
            why: "Runners who follow this ratio consistently show better long-term development and lower injury rates than those who train at moderate intensity most of the time. The easy runs build aerobic base; the hard runs provide the specific stimulus.",
            how: "Identify your easy pace using the talk test: you can speak in complete sentences without gasping. Run every easy session at this pace, even if it feels slow. If you run 4 times per week, 3 runs are easy and 1 is hard.",
          },
          {
            title: "Base Before Speedwork", type: "tip",
            what: "Building a consistent foundation of easy mileage for at least 8 to 12 weeks before introducing interval training, tempo runs, or race-specific speed sessions.",
            why: "The aerobic system adapts within weeks. Connective tissue — tendons, ligaments, bone — takes months. Adding speed before connective tissue can handle the load is the most common cause of running injuries.",
            how: "For the first 8 to 12 weeks of any running programme, run only easy pace. No intervals. No tempo. Only introduce one speed session per week after the base period, and only if easy running has been consistent with no pain.",
          },
          {
            title: "Total Load Across All Sports", type: "tip",
            what: "Counting all demanding physical activity when planning running load — not just running sessions.",
            why: "A 90-minute tennis match, a climbing session, or a hard gym session all tax the connective tissue and central nervous system. Planning running in isolation from other training leads to underestimating total load.",
            how: "Before each week, look at all planned training across all sports. Hard tennis session on Tuesday? Do not schedule a hard running session on Monday or Wednesday. Treat every demanding session, regardless of sport, as a withdrawal from the same recovery account.",
          },
          {
            title: "Restart Protocol", type: "protocol",
            what: "A structured approach for returning to running after any break of 2 or more weeks, regardless of how fit you feel.",
            why: "Cardiovascular fitness returns within 2 to 3 weeks. Tendon and bone adaptation takes months. After a break, you will feel ready to run at your previous volume long before the connective tissue can safely handle it.",
            how: "Week 1-2: run-walk intervals (1 minute running, 1 minute walking) for 20 minutes, 3 times. Week 3-4: continuous easy running for 20 to 25 minutes, 3 times. Week 5-8: gradually extend easy runs. Only after 8 weeks of uninterrupted running should you consider increasing intensity.",
          },
          {
            title: "The Simplest Version That Works", type: "protocol",
            what: "The minimum viable running programme: three easy runs per week, one longer than the others, plus calf raises and core work twice per week.",
            why: "Complexity does not improve results for someone running fewer than 4 times per week. The simplest programme done consistently outperforms the optimal programme done intermittently.",
            how: "Run 3 times per week at easy conversational pace. Make one run 50 percent longer than the other two. Twice a week: 3 sets of 12 calf raises (straight and bent knee) and a 2-minute plank plus 1-minute side planks. Do this for 3 months before adding anything else.",
            durationOrReps: "3 runs/week + 2 strength sessions/week for 3 months minimum",
          },
        ],
      },
      {
        title: "Physiological Foundation",
        items: [
          {
            title: "Aerobic System Priority", type: "concept",
            what: "Even in a 5km race, over 90 percent of energy comes from aerobic metabolism. In a half marathon or longer, the figure exceeds 99 percent.",
            why: "Most recreational runners underinvest in aerobic development because easy running feels unproductive. The aerobic system is the engine everything else runs on. Intervals without a strong aerobic base produce short-term gains that plateau quickly.",
            how: "Run easy, often, and consistently for months before adding intensity. Judge aerobic development by how long you can run at a conversational pace, not by how fast your intervals feel.",
          },
          {
            title: "Lactate Threshold", type: "concept",
            what: "The exercise intensity at which lactate accumulates in the blood faster than the body can clear it. Below threshold, effort is sustainable for long periods. Above threshold, fatigue builds exponentially.",
            why: "Improving lactate threshold is one of the highest-return adaptations for distance runners — it allows you to hold a faster pace before the wheels come off.",
            how: "Threshold pace is roughly the fastest pace you could sustain for 60 minutes. Tempo runs at this pace for 20 to 40 minutes are the primary way to raise it. The classic mistake is running tempo runs too fast — they should be comfortably hard, not all-out.",
          },
          {
            title: "VO2max and Its Limits", type: "concept",
            what: "VO2max is the maximum volume of oxygen your body can use during intense exercise. It sets the ceiling on aerobic performance.",
            why: "VO2max is partially genetic and improves modestly with training compared to lactate threshold. Most recreational runners would benefit more from raising their threshold as a percentage of VO2max than from pushing VO2max itself.",
            how: "VO2max intervals (short hard efforts at approximately 3km to 5km race pace, with equal recovery) are the primary stimulus. Reserve them for runners with at least 3 to 6 months of aerobic base.",
          },
          {
            title: "Connective Tissue Adaptation Speed", type: "tip",
            what: "Tendons and bones adapt to running load 2 to 3 times more slowly than the cardiovascular system and muscles.",
            why: "This mismatch is the root cause of most running overuse injuries. After a break, you return feeling cardiovascularly fit while your tendons are still catching up.",
            how: "Treat connective tissue as the constraint on your running progression, not cardiovascular fitness. Increase weekly mileage by no more than 10 percent per week. Never let how good you feel override the schedule.",
          },
        ],
      },
      {
        title: "Form and Technique",
        items: [
          {
            title: "Conversational Pace Test", type: "tip",
            what: "A simple real-time test for whether you are running at a genuinely easy pace: you can speak in complete sentences without gasping.",
            why: "Most runners who think they are running easy are running at moderate intensity. Moderate intensity does not build aerobic base efficiently.",
            how: "On your easy runs, try saying a full sentence out loud every few minutes. If you cannot complete it without pausing for breath, slow down.",
          },
          {
            title: "Trunk Support for Long Runs", type: "tip",
            what: "Maintaining an upright, stable trunk position throughout a run rather than collapsing forward as fatigue builds.",
            why: "As core fatigue accumulates, runners sink into a forward lean that compresses the thoracic spine, shortens the hip flexors, and shifts landing impact forward — increasing injury risk and reducing efficiency.",
            how: "Think of the trunk as a rigid column from hips to shoulders. Every 10 minutes, do a posture check: is your chest open? Is your head over your hips? If you notice yourself collapsing, shorten the stride briefly to reset before continuing.",
          },
          {
            title: "Cadence and Ground Contact", type: "tip",
            what: "Running cadence (steps per minute) affects ground contact time, impact forces, and injury risk. Most recreational runners have cadences between 150 and 160; elite runners run at 180 or higher.",
            why: "A low cadence usually correlates with overstriding — landing with the foot well in front of the centre of mass. This braking position increases impact force and Achilles load.",
            how: "Count your steps for 30 seconds and double it. If below 165, aim to increase by 5 percent over 4 weeks. Use a metronome app set to your target cadence. Focus on shorter, quicker steps rather than longer strides.",
          },
          {
            title: "Nasal Breathing at Easy Pace", type: "tip",
            what: "Breathing exclusively through the nose during easy runs as a real-time test and training method for keeping intensity genuinely easy.",
            why: "Nasal breathing limits airflow, which naturally caps running intensity at a truly aerobic level. If you cannot maintain nasal breathing, your pace is not easy.",
            how: "On easy runs, close the mouth and breathe through the nose only. If you need to open the mouth, slow down until nasal breathing is comfortable. Begin with the first 10 minutes and extend from there.",
          },
        ],
      },
      {
        title: "Injury Prevention",
        items: [
          {
            title: "Eccentric Calf Raises — Permanent Protocol", type: "exercise",
            what: "Slow-lowering calf raises off a step, targeting the calf and Achilles eccentrically — not as rehabilitation, but as a permanent twice-weekly maintenance protocol.",
            why: "Achilles tendinopathy is the most common injury that ends running comebacks. Eccentric calf loading is the most evidence-supported prevention method. Doing it permanently maintains tendon resilience as training load increases.",
            how: "Stand on a step with heels off the edge. Rise on both feet. Transfer weight to one foot. Lower slowly over 3 seconds. Use both straight-leg (gastrocnemius) and bent-knee (soleus) variations. Add load when 3x12 feels easy.",
            durationOrReps: "3 sets x 12 reps each leg, straight and bent knee, twice weekly — permanently",
          },
          {
            title: "Achilles Return-to-Running Protocol", type: "protocol",
            what: "A structured progression from rest back to running after any Achilles pain, using isometric loading, progressive eccentric loading, and incremental reintroduction of running.",
            why: "Returning too quickly after Achilles pain is the primary cause of reinjury and progression to a more serious tendinopathy.",
            how: "Phase 1 (pain present): isometric calf holds — press into the floor for 30 to 45 seconds, 5 sets, twice daily. Phase 2 (pain below 3/10): eccentric calf raises, body weight, 3x15. Phase 3 (no pain with eccentric): run-walk intervals, 1 minute running, 2 minutes walking. Progress weekly only if pain remains below 3/10.",
          },
          {
            title: "Adductor Load Management", type: "tip",
            what: "Monitoring and managing the load placed on the hip adductors, which are vulnerable to strain when running volume or hill work increases suddenly.",
            why: "Adductor injuries are often triggered by sudden increases in hill work or speed — especially in runners who also play tennis or do lateral sports.",
            how: "Do not add hills until 4 weeks of flat easy running is established. Never increase both hill work and total volume in the same week. At the first sign of groin tightness, reduce volume by 30 percent and eliminate hills for 1 week.",
          },
          {
            title: "Core Stability Minimum", type: "protocol",
            what: "The minimum core work required to support consistent running: a 2-minute plank and 1-minute side planks each side, twice per week.",
            why: "Core stability determines how well the trunk can remain rigid during running gait. A weak core allows the pelvis to drop on each foot strike, increasing load on the IT band, hip abductors, and lower back.",
            how: "Front plank: hold 2 minutes with hips level, breathing normally. Right side plank: hold 1 minute. Left side plank: hold 1 minute. Add hip dips or leg raises when 2 minutes becomes easy.",
            durationOrReps: "Plank 2 min + side planks 1 min each, twice weekly",
          },
          {
            title: "Morning vs Evening Training", type: "tip",
            what: "Scheduling running sessions in the morning when possible rather than leaving them to the evening.",
            why: "Evening training is vulnerable to fatigue, social events, work overrun, and decision fatigue. The probability of a session happening is significantly lower when it is planned for later in the day.",
            how: "Set out running clothes the night before. Commit to one morning run per week as an unbreakable anchor. Extend from there. The goal is to have sessions that are protected from the things that reliably derail evening sessions.",
          },
        ],
      },
    ],
  },

  // ── HABIT DESIGN ───────────────────────────────────────────────────────────
  {
    slug: "habit-design", title: "Habit Design", icon: "BookOpen",
    description: "The science and practice of building lasting habits: the four laws, practical design methods, identity-based change, and advanced strategies.",
    categories: [
      {
        title: "The Four Laws",
        items: [
          {
            title: "Make It Obvious", type: "concept",
            what: "The first law of behaviour change: a habit must be visible and prominent in your environment before it can be performed automatically.",
            why: "Behaviour is triggered by cues. If the cue is invisible — the book hidden on a shelf, the running shoes in a closed cupboard — the habit has no trigger. Most habits are abandoned not from lack of intention but from lack of a reliable cue.",
            how: "Put the cue for the desired habit in plain sight. Put your running shoes next to the door. Use an implementation intention to specify the cue: 'When I sit down at my desk after breakfast, I will open my notebook.' Make the bad habit cue invisible by the same logic.",
          },
          {
            title: "Make It Attractive", type: "concept",
            what: "The second law: a habit must be appealing to sustain motivation through the early period before the identity shift has happened.",
            why: "Dopamine is released in anticipation of a reward, not just upon receiving it. Making a habit attractive elevates the anticipatory dopamine signal that motivates starting.",
            how: "Pair a habit you need to do with an activity you want to do: only listen to a favourite podcast while running. Join a group that already performs the behaviour you want — humans are wired to adopt the habits of those they are around.",
          },
          {
            title: "Make It Easy", type: "concept",
            what: "The third law: reduce the friction between you and the desired habit to the point where starting requires almost no decision-making.",
            why: "Every action has an activation energy. Small amounts of friction reliably prevent habits from forming. Making a habit easy means removing the obstacles between intention and the first step.",
            how: "Apply the Two-Minute Rule: scale down the habit to something that takes 2 minutes or less. The goal is not to do the 2-minute version forever — it is to build the identity of someone who starts. Prepare the environment the night before.",
          },
          {
            title: "Make It Satisfying", type: "concept",
            what: "The fourth law: the brain encodes behaviours that produce immediate positive feedback as habits faster than behaviours whose rewards are delayed.",
            why: "The human brain is biased toward immediate reward. Most habits worth having have delayed rewards. Without immediate satisfaction attached to the behaviour, the brain has no strong signal to repeat it.",
            how: "Add an immediate reward at the moment of completion. Track the habit visually — marking a checkbox releases a small dopamine signal. Never miss twice: when you miss a day, the priority is returning to the habit immediately, not punishing the miss.",
          },
          {
            title: "The Inversion — Breaking Bad Habits", type: "concept",
            what: "Breaking an unwanted habit by inverting the four laws: make it invisible, unattractive, difficult, and unsatisfying.",
            why: "The same mechanisms that build good habits maintain bad ones. Understanding this gives you a practical method for disruption rather than relying on willpower.",
            how: "Make the cue invisible (put the phone in another room). Make the craving unattractive (reframe consciously). Increase friction (add deliberate steps between you and the behaviour). Remove the reward (avoid substituting a different reward for the same craving).",
          },
        ],
      },
      {
        title: "Habit Design",
        items: [
          {
            title: "Habit Stacking", type: "protocol",
            what: "A method for creating a new habit by linking it to an existing one, using the formula: 'After I [CURRENT HABIT], I will [NEW HABIT].'",
            why: "Existing habits are already encoded neural pathways with reliable cues and rewards. Attaching a new behaviour to an existing one borrows the cue and momentum of the established habit.",
            how: "Write the formula precisely: 'After I pour my morning coffee, I will sit down and open my notebook.' The more specific and consistent the anchor habit, the more reliable the stack.",
          },
          {
            title: "Implementation Intentions", type: "protocol",
            what: "A specific plan that states when, where, and how a behaviour will occur: 'I will [BEHAVIOUR] at [TIME] in [LOCATION].'",
            why: "People who specify when and where they will perform a behaviour are significantly more likely to follow through than those with a general intention.",
            how: "For each habit, complete the sentence: 'I will [behaviour] at [specific time] in [specific place].' Write it down. When the time and place arrive, no decision is required.",
          },
          {
            title: "Environment Design", type: "tip",
            what: "Deliberately arranging your physical environment to make desired behaviours easy and automatic while making undesired behaviours difficult.",
            why: "Your environment cues your behaviour constantly and automatically. Designing an environment where the good choice is the easy choice eliminates the need for willpower in the moment.",
            how: "Walk through your environment and audit: what does it make easy? What does it make hard? Redesign it. Put fruit on the counter. Charge the phone in the kitchen, not the bedroom.",
          },
          {
            title: "Two-Minute Rule", type: "tip",
            what: "Scaling a new habit down to a version that takes 2 minutes or less, as the entry point for building identity and consistency before the behaviour scales up.",
            why: "Habits are built through repetition, not duration. Ten consecutive days of opening a notebook for 2 minutes builds the identity of a writer more reliably than one 2-hour session followed by a 2-week gap.",
            how: "Reduce any habit: 'Read for 30 minutes' becomes 'read one page.' 'Do a 45-minute workout' becomes 'put on workout clothes.' Commit to doing only the 2-minute version for 2 weeks. Extension happens naturally once the identity is established.",
          },
          {
            title: "Temptation Bundling", type: "protocol",
            what: "Pairing a habit you need to do with an activity you genuinely want to do, so access to the wanted activity is contingent on performing the needed habit.",
            why: "Linking a difficult habit to an immediate reward creates an anticipatory dopamine signal at the moment you begin — activating the craving for the reward before the behaviour is complete.",
            how: "List things you enjoy. List habits you avoid. Pair them: only listen to that podcast while exercising. Only watch that show while folding laundry. The wanted activity becomes the reward for the needed habit.",
          },
          {
            title: "Habit Tracking as Visual Evidence", type: "tip",
            what: "Recording each completed habit instance in a visible format — a paper calendar with an X, an app, a jar of paper clips — to create a growing chain of evidence for a new identity.",
            why: "Tracking creates an immediate, satisfying signal of completion and generates visible evidence of a growing streak, reinforcing the identity of someone who does this behaviour consistently.",
            how: "Choose the simplest possible tracking format you will actually use. Mark it immediately after completing the habit. When you break the streak: never miss twice.",
          },
        ],
      },
      {
        title: "Identity-Based Change",
        items: [
          {
            title: "Vote for Your Identity", type: "concept",
            what: "Every action you take is a vote for the type of person you believe yourself to be. Habits are most durable when they are expressions of identity rather than means to an outcome.",
            why: "Outcome-based habits depend on results for motivation. Identity-based habits draw motivation from the identity itself. The person who exercises because they are an athlete continues when motivation is low.",
            how: "Identify the type of person you want to be, not the outcome you want. Instead of 'I want to run a marathon', ask: 'What would a consistent runner do today?' Each action accumulates as evidence for the identity.",
          },
          {
            title: "Outcomes, Systems, and Identity", type: "concept",
            what: "Three levels at which behaviour change can happen: changing outcomes (results), changing processes (systems and habits), or changing identity (who you believe you are).",
            why: "Most people focus on outcomes. But outcomes are lagging indicators. The system produces the outcome; the identity sustains the system. Working backward from identity is the most durable approach.",
            how: "Start with identity. Ask: who is the person I want to become? Then build systems — habits, routines, environments — that express that identity. Goals and outcomes follow.",
          },
          {
            title: "Minimum Viable Habit", type: "tip",
            what: "The smallest version of a habit that still counts as doing it — the floor below which you never drop, regardless of energy, time, or motivation.",
            why: "Having a minimum version prevents an all-or-nothing pattern. A minimum viable habit keeps the identity intact on bad days.",
            how: "For each habit, define the minimum version explicitly: 'A workout is at minimum 10 minutes of movement.' 'Reading means at minimum one page.' When motivation is low, do the minimum — but not zero.",
          },
          {
            title: "Evidence Accumulation", type: "concept",
            what: "The process by which consistent small actions build an increasingly strong internal case for a new identity over time.",
            why: "Identity change is not a switch that flips on commitment day. It is an accumulation of evidence through repeated small actions.",
            how: "Focus on consistency over intensity. One push-up every day for 3 months builds more identity evidence than 100 push-ups twice in one week. Ask before every session: 'Can I do the minimum to maintain the identity today?'",
          },
        ],
      },
      {
        title: "Advanced Strategies",
        items: [
          {
            title: "Plateau of Latent Potential", type: "concept",
            what: "The frustrating early phase of any habit where results are invisible because change is compounding below the surface, before a threshold is crossed and progress becomes suddenly visible.",
            why: "Most habits are abandoned during the latent potential phase because effort seems unmatched by results. Understanding that this is a structural feature of compounding change — not evidence of failure — is the most useful mental model for sustaining habits through the early period.",
            how: "When a habit feels like it is not working, ask: is it actually not working, or is the result not yet visible? Set a time commitment before evaluating: 30 days minimum, 90 days before abandoning.",
          },
          {
            title: "Goldilocks Rule", type: "concept",
            what: "Habits are most likely to be maintained when the challenge is approximately at the edge of current ability — not so easy that boredom sets in, not so hard that overwhelm causes avoidance.",
            why: "Boredom and overwhelm are the two most common reasons people abandon habits. Both are avoidable through deliberate calibration of difficulty.",
            how: "Periodically review each habit and ask: is this still challenging? Have I found ways to make it slightly harder to maintain engagement? Add load for physical habits. Increase material difficulty for cognitive ones.",
          },
          {
            title: "Never Miss Twice", type: "tip",
            what: "The rule that missing one instance of a habit is an accident; missing twice is the beginning of a new (bad) habit. After any miss, the priority is getting back on track immediately.",
            why: "Missing once has almost no effect on long-term habit strength. Missing twice begins to establish a pattern. The most dangerous moment is the day after a miss, not the miss itself.",
            how: "When you miss a habit, do not try to compensate by doubling up tomorrow. Simply return to the normal version the next day. The only commitment: never miss the same habit two days in a row.",
          },
          {
            title: "Decisive Moments", type: "concept",
            what: "Small, seemingly insignificant choices that set the trajectory for the following minutes or hours — opening the fridge when tired, sitting on the couch at 7pm, picking up the phone after waking.",
            why: "Each decisive moment determines the path you are on for the next window of time. Awareness of these moments allows you to interrupt automatic downstream behaviours before they begin.",
            how: "Identify the 3 to 5 small choices in your day that reliably trigger your best or worst patterns. Decide in advance what you will do at each one. The moment arrives and the decision is already made.",
          },
          {
            title: "Dopamine and Anticipation", type: "concept",
            what: "Dopamine is released primarily in anticipation of a reward, not just upon receiving it. Craving, not satisfaction, is what drives behaviour.",
            why: "Understanding that the motivating force is anticipatory dopamine explains why making a habit attractive works, why streaks motivate, and why removing the cue of a bad habit is more effective than resisting the craving once it starts.",
            how: "Design habits with visible anticipation signals: set out training gear the night before so you see it in the morning. Use a visible tracker so that the approaching completion day is a cue.",
          },
        ],
      },
    ],
  },

  // ── BREATHING ──────────────────────────────────────────────────────────────
  {
    slug: "breathing", title: "Breathing", icon: "Wind",
    description: "Daily breathing protocols, CO2 tolerance training, performance breathing for sport, and sleep and recovery techniques.",
    categories: [
      {
        title: "Daily Practice",
        items: [
          {
            title: "BOLT Score — Weekly Benchmark", type: "protocol",
            what: "A simple test that measures your CO2 tolerance by timing how long after an exhale it takes for the first genuine urge to breathe to arise.",
            why: "The BOLT score is a reliable marker of breathing health and CO2 tolerance. A higher score correlates with lower resting heart rate, better sleep, calmer response to stress, and improved recovery between efforts.",
            how: "Sit relaxed. Take 3 normal nose breaths. After the third exhale, pinch your nose. Time until the first real urge to breathe — the first diaphragm twitch or swallow. Stop at that first urge, not the maximum hold. Targets: below 10 seconds needs work, 10-20 is average, 20-40 is well-trained, 40+ is elite. Measure every Monday morning before coffee.",
          },
          {
            title: "Morning Box Breathing", type: "protocol",
            what: "A 3-minute activating breathing exercise performed immediately after getting out of bed, using a 4-4-4-4 pattern: inhale, hold, exhale, hold.",
            why: "Box breathing activates the diaphragm before the day's posture collapses you into a chair. The 4-second holds gently elevate CO2, triggering an alerting response that replaces the caffeine jolt with a genuine physiological wake-up.",
            how: "Sit upright, nose only throughout. Inhale 4 seconds. Hold full 4 seconds. Exhale 4 seconds. Hold empty 4 seconds. One cycle. Perform for 3 minutes, approximately 12 cycles. If lightheaded, shorten holds to 3 seconds.",
            durationOrReps: "3 min, 12 cycles, every morning",
          },
          {
            title: "Coherent Breathing — 5.5-Second Cycle", type: "protocol",
            what: "A resonant breathing pattern of 5.5 seconds inhale and 5.5 seconds exhale through the nose, producing approximately 5 to 6 breaths per minute.",
            why: "This specific cadence produces measurable increases in heart rate variability within seconds. Blood pressure drops, the nervous system shifts toward parasympathetic dominance, and focus improves.",
            how: "Sit at your desk before the first focused work block. Set a metronome or use a breathing app at 11 beats per minute. Breathe in for 5.5 seconds, out for 5.5 seconds, nose only. Do not count — use the audio guide to avoid mental overhead. Perform for 5 minutes.",
            durationOrReps: "5 min, before first work session",
          },
          {
            title: "Evening 4-7-8 Wind-Down", type: "protocol",
            what: "A 2-minute breathing protocol performed in bed with lights off, using a long exhale to activate the parasympathetic nervous system and prepare for sleep.",
            why: "A double-length exhale shifts the autonomic nervous system toward rest more reliably than any other non-pharmacological intervention. It replaces the doomscroll wind-down with a 2-minute physiological switch.",
            how: "In bed, lights off, lying down. Inhale through the nose for 4 seconds. Hold for 7 seconds. Exhale slowly through the mouth for 8 seconds — this is the key, not the hold. Perform 4 to 6 cycles. If the hold creates anxiety, shorten it to 3 seconds.",
            durationOrReps: "4-6 cycles, in bed before sleep",
          },
        ],
      },
      {
        title: "CO2 Training",
        items: [
          {
            title: "CO2 Tolerance Explained", type: "concept",
            what: "The urge to breathe is triggered by rising CO2 in the blood, not by falling oxygen. CO2 tolerance is the ability to remain calm and functional as CO2 rises during exercise or breath-holding.",
            why: "A low CO2 threshold means the urge to breathe arrives early and feels urgent — causing over-breathing, elevated resting heart rate, and slower recovery between hard efforts. Training CO2 tolerance raises this threshold.",
            how: "CO2 tolerance is trainable through two methods: (1) consistent nasal breathing during daily life and easy exercise, which gently raises the CO2 setpoint over weeks, and (2) structured CO2 table sessions 3 times per week.",
          },
          {
            title: "Baseline Hold Test", type: "protocol",
            what: "A one-time calibration to find your comfortable maximum breath hold, used to set the hold duration in CO2 table sessions.",
            why: "CO2 table sessions must be calibrated to your current capacity. Too short and the stimulus is insufficient; too long and the session becomes genuinely hypoxic rather than a CO2 training protocol.",
            how: "Lie down. Breathe normally for 2 minutes. Take a relaxed inhale through the nose. Hold. Time until the first strong urge to breathe — stronger than the first twitch, but before maximum discomfort. Stop there. Your CO2 table hold should be set at approximately 60 to 65 percent of this value.",
          },
          {
            title: "Beginner CO2 Table — 8 Rounds", type: "protocol",
            what: "A structured breath-hold session where the hold duration stays constant across 8 rounds while the rest interval decreases, training the body to tolerate rising CO2 with progressively less recovery.",
            why: "Decreasing the rest interval forces the body to begin each hold with a higher CO2 baseline. This is the specific stimulus that trains CO2 tolerance.",
            how: "Set hold at 60-65 percent of your comfortable maximum. Perform 8 rounds with decreasing rest: 1:30, 1:15, 1:00, 0:45, 0:30, 0:30, 0:30, 0:30 (rest), then hold. Early rounds feel easy; later rounds will feel uncomfortable — this is the training effect. Only while lying down on a flat surface, never near water.",
            durationOrReps: "8 rounds, approx 12 min total, 3x per week",
          },
          {
            title: "Progression Rule", type: "tip",
            what: "The rule for advancing CO2 table difficulty: add 5 seconds to the hold duration across the whole table every 2 weeks.",
            why: "Progressive overload is required for continued adaptation. Fixed increments prevent under-challenging the system after adaptation while avoiding rapid increases that cause session failures.",
            how: "Keep a log. Every 2 weeks, add 5 seconds to the hold time in all 8 rounds. Do not increase frequency — 3 times per week is the appropriate stimulus.",
          },
        ],
      },
      {
        title: "Performance Breathing",
        items: [
          {
            title: "Recovery Between Tennis Points", type: "tip",
            what: "Using a deliberate exhale between points to lower heart rate and reduce muscle tension before the next point begins.",
            why: "Heart rate spikes during a point and does not fully recover in the short time between points without intervention. Elevated heart rate reduces fine motor control and slows reaction time.",
            how: "As soon as the point ends, take one slow breath: inhale through the nose for 4 seconds, exhale through the mouth for 6 seconds. The extended exhale drives the parasympathetic response. Do this before your pre-point ritual.",
          },
          {
            title: "Breathing Through a Climbing Crux", type: "tip",
            what: "Maintaining a deliberate exhale through the hardest moves of a climbing sequence rather than holding the breath, which is the automatic response to difficulty.",
            why: "Breath-holding during hard effort causes an immediate increase in muscle tension and grip force, accelerates pump, and inhibits the fine motor control required for precise footwork.",
            how: "In training, choose one move that you habitually hold your breath on. Practise it repeatedly with a deliberate exhale at the moment of maximum effort. This feels counterintuitive initially. Once trained, breathing through effort becomes available automatically.",
          },
          {
            title: "Diaphragmatic Mechanics", type: "concept",
            what: "The diaphragm is the primary breathing muscle. Diaphragmatic breathing involves the lower ribs and belly expanding on the inhale, not the chest and shoulders rising.",
            why: "Most adults breathe into the chest only. Chest-dominant breathing activates neck and shoulder muscles as secondary breathing muscles, contributing to chronic upper-body tension and reduced heart rate variability.",
            how: "Place one hand on the chest and one on the belly. Breathe in through the nose. The belly hand should rise; the chest hand should remain almost still. Practise for 5 minutes daily until it becomes the resting default.",
          },
          {
            title: "Why CO2 Drives the Urge to Breathe", type: "concept",
            what: "The primary trigger for the urge to breathe is rising blood CO2, not falling blood oxygen. This is why CO2 tolerance training changes how breathing feels during exertion.",
            why: "Most people assume they need to breathe because they are running out of oxygen. In reality, blood oxygen remains high even during moderate exercise. The discomfort comes from CO2 accumulation — a manageable signal, not an emergency.",
            how: "When you feel the urge to breathe during a hard run or climbing section, remind yourself that your oxygen is not depleted. The discomfort is CO2. Over time, CO2 table training raises the threshold at which this discomfort becomes urgent.",
          },
          {
            title: "Nasal Breathing During Exercise", type: "tip",
            what: "Breathing through the nose during exercise — particularly at easy to moderate intensities — rather than defaulting to mouth breathing at any level of exertion.",
            why: "Nasal breathing filters, humidifies, and warms air. It produces nitric oxide which dilates airways. It limits airflow, capping intensity at a genuinely aerobic level and raising CO2 tolerance gradually over weeks.",
            how: "Begin with easy efforts only. Keep the mouth closed. If you must open the mouth to breathe, slow down. Over 4 to 6 weeks, the pace at which nasal breathing is comfortable will increase. Do not force nasal breathing during genuinely hard efforts until your BOLT score is above 25.",
          },
        ],
      },
      {
        title: "Sleep and Recovery",
        items: [
          {
            title: "Exhale Length and Autonomic Control", type: "concept",
            what: "The length of the exhale relative to the inhale determines which branch of the autonomic nervous system is dominant. A longer exhale activates the parasympathetic system; a longer inhale activates the sympathetic system.",
            why: "Most adults have chronic sympathetic dominance — a baseline nervous system state that is slightly stressed even at rest. Extending the exhale is the most direct, immediate method for shifting this balance.",
            how: "For calming: make the exhale longer than the inhale. Any ratio where exhale exceeds inhale produces the effect — 4 in, 6 out; 4 in, 7 hold, 8 out. For activation: make the inhale longer or add a full inhale hold.",
          },
          {
            title: "Mouth Tape for Sleep", type: "tip",
            what: "Applying a small strip of medical tape over the lips before sleep to prevent mouth breathing during the night.",
            why: "Mouth breathing during sleep bypasses the nose's filtering, humidifying, and nitric oxide production functions. Nasal breathing during sleep is associated with better sleep quality and lower resting heart rate on waking.",
            how: "Use medical micropore tape or purpose-made mouth tape. Start by wearing it for 10 minutes while seated and awake. Progress over 2 weeks before using it overnight. Only use when nasal passages are clear. Do not use if you have sleep apnea without consulting a doctor.",
          },
          {
            title: "Sleep Breathing Audit", type: "tip",
            what: "Using a smartphone app that records sleep audio to determine whether you are snoring or mouth-breathing during the night without being aware of it.",
            why: "Many people who mouth-breathe during sleep have no subjective awareness of it. An audio recording provides objective evidence that guides intervention.",
            how: "Download a sleep recording app. Place the phone on your nightstand and run a recording for one full night. Review in the morning. Look for patterns: does snoring correlate with a particular sleep position? Use the data to guide which intervention to try first.",
          },
          {
            title: "Safety Rules for Breath Holds", type: "tip",
            what: "Non-negotiable rules for safe breath-hold practice that apply regardless of experience level.",
            why: "Breath-hold training creates hypercapnic and hypoxic conditions. In water, hypoxic blackout can occur without warning — it is painless and rapid, and has killed experienced free divers.",
            how: "Follow these rules absolutely: (1) Never perform breath holds in or near water without a trained buddy present. (2) Never drive immediately after an intense breath-hold session. (3) Stop immediately if you feel lightheaded, see visual disturbances, or feel abnormal tingling. (4) Always perform CO2 table sessions lying on a flat surface, never standing.",
          },
        ],
      },
    ],
  },
  // ── BUDGET ──────────────────────────────────────────────────────────────────
  {
    slug: "budget", title: "Budget", icon: "Wallet",
    description: "Money as a skill",
    dynamicDisplayOrder: true,
    categories: [
      {
        title: "Principles",
        items: [
          {
            title: "Why budget exists", type: "concept",
            what: "Budgeting is not about restriction. It is the practical lever for a single goal: owning your time. Every financial decision — what to spend, what to save, what to invest — is a vote for how much of your life you spend doing what you choose versus what circumstances force on you.",
            why: "Without a deliberate allocation of money, spending defaults to whatever is loudest or most convenient. Over a working life, the gap between 'budgeted' and 'unbudgeted' does not close — it compounds in the wrong direction. The person who assigns every euro a job months ahead of when it is needed lives in a qualitatively different relationship with their work and time than the person who is always one unexpected bill away from anxiety.",
            how: "Start with one question: if your income stopped tomorrow, how many months could you maintain your current life without distress? That number is your current autonomy score. Every budget decision either raises or lowers it. A useful reframe for any spending choice: does this purchase buy me more time, or does it buy me things that require more time to maintain and fund?",
          },
          {
            title: "The four conscious-spending buckets", type: "concept",
            what: "Divide your monthly net income into four buckets — Fixed Costs, Investments, Savings, and Guilt-Free Spending — and automate a transfer into each one the day after payday. Once the automation runs, you are free to spend the Guilt-Free bucket on anything without tracking it.",
            why: "Traditional budgets fail because they ask you to suppress every desire. The four-bucket structure replaces guilt with permission: you are explicitly allowed to spend the Guilt-Free bucket on whatever you love, as long as the other three are funded first. This removes the psychological friction that causes most people to abandon budgets within two months.",
            how: "Starting percentages (net income after taxes and social security):\n\n• Fixed Costs — 50–60 %: rent or mortgage, utilities, groceries, insurance, phone, minimum debt payments.\n• Investments — 10 %: follow the Belgian investing ladder (see the dedicated item).\n• Savings — 5–10 %: emergency fund, annual true expenses (autokeuring, holiday, gifts), and medium-term goals.\n• Guilt-Free Spending — 20–35 %: dining out, hobbies, clothes, travel — whatever you enjoy.\n\nBelgian reality check: Belgian housing costs frequently push Fixed Costs to 65–70 % for households with a mortgage in Brussels or Antwerp. This is not a failure — it is the local cost structure. Adjust the other buckets proportionally rather than flagging yourself as 'over target'. The buckets are defaults, not laws.",
          },
          {
            title: "Embracing true expenses", type: "protocol",
            what: "Every predictable-but-irregular cost in your life — paid once or twice a year but entirely foreseeable — is a monthly bill you have been refusing to acknowledge. Divide its annual total by 12 and fund a dedicated savings category every month. By the time the bill arrives, the money is already there.",
            why: "The single most common reason 'good budgets' collapse is a large bill that was predictable from the start. The car insurance renewal, the school-year opvang fees, the holiday flights, the property tax — none of these are surprises. They only feel like emergencies because most budgets are built month-to-month. A budget that handles true expenses eliminates this category of stress entirely.",
            how: "Make a list of everything you pay that is not monthly. Common Belgian examples:\n\n• Autokeuring (car technical inspection) — every 1–2 years\n• Onroerende voorheffing (property tax) — annual\n• Hospitalisatieverzekering premium — annual or quarterly\n• Mutualiteit out-of-pocket costs (remgeld, dental, glasses)\n• Opvang / school fees — semester or annual\n• Holiday and travel costs\n• Christmas and birthday gifts\n• Annual software subscriptions\n• Pet vaccines and vet visits\n• Car insurance, tyres, brakes\n\nFor each, estimate the annual total and divide by 12. Add that amount as a recurring transfer into a labelled savings sub-account or envelope each month. Do not touch those funds for anything else.",
          },
          {
            title: "The Belgian investing ladder", type: "protocol",
            what: "Not all euros you invest are equal. Belgium has a stack of tax-advantaged products, each with its own ceiling and tax benefit. Working through them in priority order — rather than investing arbitrarily — is worth several percentage points of net return per year on modest contributions.",
            why: "The most common Belgian investing mistake is skipping the lower rungs (where the government gives you 25–30 % back via tax reduction) and going straight to a brokerage account. That decision costs real money — a 30 % tax reduction on the first €1,050 you invest annually is a guaranteed immediate return that no market can reliably match.",
            how: "Work through these rungs in order. Stop at each one before moving to the next. All ceilings are for tax year 2026 and are frozen through 2030.\n\n**Rung 1 — Employer match (groepsverzekering / pensioenfonds)**\nIf your employer offers to match contributions to a group pension plan, contribute enough to capture the full match. This is free money. Never skip it.\n\n**Rung 2 — High-interest debt**\nPay off any consumer credit or credit-card debt before anything else. A 10–15 % interest rate on debt is a guaranteed 10–15 % return on repayment — better than any investment on the next rungs.\n\n**Rung 3 — Pensioensparen klassiek** — ceiling €1,050/year\nContributes to your third pillar. You receive a 30 % tax reduction — up to €315 back. An alternative ceiling of €1,350 exists with a 25 % reduction: only choose it if you save more than €1,260/year.\n\n**Rung 4 — Langetermijnsparen** — ceiling €2,450/year\nAlso 30 % tax reduction. Important: langetermijnsparen shares a fiscale korf (tax basket) with mortgage capital repayments and life-insurance premiums. If you have a mortgage, check how much of the korf is already used before contributing here.\n\n**Rung 5 — Accumulating UCITS ETFs**\nOnce rungs 1–4 are filled (or not available to you), invest the remainder in low-cost, accumulating UCITS-compliant index ETFs via a Belgian broker (Bolero, MeDirect, Saxo Belgium). Accumulating ETFs avoid the 30 % withholding tax on distributions. You will pay TOB (beurstaks) on each transaction, and from 2026 a 10 % meerwaardebelasting applies to gains above a €10,000 annual personal exemption.\n\n**Rung 6 — Regulated savings account (spaarrekening)**\nLow yield. Useful only for your emergency cash buffer — typically 3–6 months of essential fixed costs. The first €1,020 of annual interest is tax-free per person.",
          },
          {
            title: "Your 25\u00d7 number", type: "concept",
            what: "Financial independence has a concrete threshold: save 25 times your annual spending in a diversified index portfolio. Withdraw no more than 4 % of the total per year. History shows this rate almost never depletes the principal across any 30-year window. Once you cross the threshold, your portfolio funds your life — whether or not you work.",
            why: "Without a target number, retirement planning is a vague anxiety. The 25\u00d7 rule converts it into a solvable equation. It also reframes every monthly budget decision: every euro saved and invested is a step toward a specific, calculable finish line — not an abstract virtue.",
            how: "**The calculation:**\nEstimate your annual spending in retirement. Multiply by 25. That is your target portfolio.\n\nExample: €36,000/year in spending → €900,000 target.\n\n**The Belgian adjustment — your number is likely smaller:**\nBelgian state infrastructure covers costs that American FIRE plans budget privately:\n• The wettelijk pensioen provides a floor income in retirement.\n• The mutualiteit covers most healthcare costs (the out-of-pocket layer — remgeld, hospitalisatieverzekering — is far smaller than US private insurance costs).\n• Unemployment, sickness, and parental leave are statutorily protected during working years.\n\nFor a Belgian, the correct calculation is:\n25 × (annual spending − projected state pension amount) = target portfolio.\n\nIf your projected wettelijk pensioen covers €15,000/year and you need €36,000/year, you need to fund €21,000/year privately — requiring a portfolio of roughly €525,000, not €900,000.\n\n**Using the app:**\nThe Budget dashboard's 25\u00d7 card lets you enter your annual spending and your expected state pension. It computes the adjusted target automatically. Update the state pension figure as your career progresses — mypension.be shows a current projection.",
          },
          {
            title: "Before a big purchase: three filters", type: "protocol",
            what: "Before any purchase above your personal threshold, run three short questions: the Inner Scorecard test, the Utility vs. Status filter, and the six-month question. The goal is not to stop you spending — it is to make sure you know why you want what you want before you commit.",
            why: "Most buyers' remorse is not about the money. It is about discovering, three months later, that the purchase was driven by how it would appear to others, or by a novelty that faded faster than expected. These filters surface that knowledge before the decision, not after.",
            how: "**Filter 1 — The Inner Scorecard**\nAsk: am I doing this for myself, or partly to signal something to others? Most large purchases are a mix of both. The portion that is for others is almost always the portion that disappoints fastest — because others stop noticing within weeks, and so do you. There is no wrong answer; the question is whether you can name the mix honestly.\n\n**Filter 2 — Utility vs. Status**\nIdentify which part of the cost is utility (how the object functions in your life) and which part is status (how it signals something to others). A basic car gets you from A to B; everything above a reliable secondhand car is increasingly status. The exercise is not to refuse all status spending — it is to know which part is which, so the inevitable fading does not surprise you.\n\n**Filter 3 — The six-month question**\nThe brain adapts to any new baseline within roughly three months. Ask: how will I feel about this in six months — not in six days? If the honest answer is 'I probably won't notice it', that is the answer. If the answer is 'I will still use it daily and it will still matter', proceed with confidence.\n\n**In the app:**\nThe 'Log a big purchase' button (the shopping bag icon in the sidebar) walks you through these three filters before recording your decision. The record stays whether you proceed, decline, or park the decision for later.",
          },
        ],
      },
    ],
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────

/**
 * Seeds all library content into the provided better-sqlite3 database instance.
 * Idempotent — safe to call on every deploy. Only inserts rows that do not
 * already exist (lookup by natural key). Does not overwrite admin edits.
 *
 * @param {import('better-sqlite3').Database} db
 */
function seedLibrary(db) {
  const findTopic   = db.prepare("SELECT id FROM library_topics WHERE slug = ?");
  const insertTopic = db.prepare(
    "INSERT INTO library_topics (slug, title, icon, description, display_order) VALUES (?, ?, ?, ?, ?)"
  );
  const maxDisplayOrder = db.prepare("SELECT COALESCE(MAX(display_order), -1) AS max_order FROM library_topics");
  const findCat     = db.prepare(
    "SELECT id FROM library_categories WHERE topic_id = ? AND title = ?"
  );
  const insertCat   = db.prepare(
    "INSERT INTO library_categories (topic_id, title, display_order) VALUES (?, ?, ?)"
  );
  const findItem    = db.prepare(
    "SELECT id FROM library_items WHERE category_id = ? AND title = ?"
  );
  const insertItem  = db.prepare(
    "INSERT INTO library_items (category_id, title, type, what, why, how, duration_or_reps, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const run = db.transaction(() => {
    let topicsAdded = 0, categoriesAdded = 0, itemsAdded = 0;

    for (let ti = 0; ti < SEED_DATA.length; ti++) {
      const topic = SEED_DATA[ti];
      let topicId;
      const existingTopic = findTopic.get(topic.slug);
      if (existingTopic) {
        topicId = existingTopic.id;
      } else {
        // For topics with dynamicDisplayOrder, compute MAX + 1 at insert time
        // rather than using the array index. This protects against future topics
        // being added between deploys. The guard only runs on new-slug inserts;
        // re-runs of existing slugs never touch display_order.
        const displayOrder = topic.dynamicDisplayOrder
          ? maxDisplayOrder.get().max_order + 1
          : ti;
        topicId = insertTopic.run(topic.slug, topic.title, topic.icon, topic.description, displayOrder).lastInsertRowid;
        topicsAdded++;
      }

      for (let ci = 0; ci < topic.categories.length; ci++) {
        const cat = topic.categories[ci];
        let categoryId;
        const existingCat = findCat.get(topicId, cat.title);
        if (existingCat) {
          categoryId = existingCat.id;
        } else {
          categoryId = insertCat.run(topicId, cat.title, ci).lastInsertRowid;
          categoriesAdded++;
        }

        for (let ii = 0; ii < cat.items.length; ii++) {
          const item = cat.items[ii];
          if (!findItem.get(categoryId, item.title)) {
            insertItem.run(categoryId, item.title, item.type, item.what, item.why, item.how, item.durationOrReps || null, ii);
            itemsAdded++;
          }
        }
      }
    }

    return { topicsAdded, categoriesAdded, itemsAdded };
  });

  return run();
}

module.exports = { SEED_DATA, seedLibrary };
