# Prompt-to-Animation Game Generator

A system that instantly converts text prompts into playable animation sequences using Spine animations and Phaser.

## 🎮 Overview

Type any prompt like **"i just went to work i hate my life"** and instantly get a fun, short playable scene that matches the vibe - character walks to work, looks sad, cries, and dramatically collapses.

## ✨ Features

- **Instant Generation**: Prompt → Playable sequence in under 1 minute
- **Smart Animation Matching**: AI analyzes emotional context and selects appropriate animations
- **Multiple Control Modes**: Auto-play, movement controls, interactive buttons, or dance challenges
- **120+ Spine Animations**: Face expressions, dances, movements, meme actions, and more
- **Responsive Controls**: Touch and keyboard support

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Activate virtual environment
source venv/bin/activate

# Install requirements (already included)
pip install -r requirements.txt
```

### 2. Set OpenAI API Key

Edit `app/core/config.py` or create a `.env` file:

```bash
OPENAI_API_KEY=your_api_key_here
```

### 3. Run the Server

```bash
python server.py
```

### 4. Open in Browser

Navigate to: `http://localhost:3333`

## 📝 Example Prompts

| Prompt | Expected Output | Control Mode |
|--------|-----------------|--------------|
| `donald trump twerking on the moon` | Jump → moonwalk → twerk → grin → victory jump | **Button**: Click to twerk |
| `i just went to work i hate my life` | Walk → idle → facepalm → cry → dramatic collapse | **Auto**: Plays automatically |
| `a dance challenge` | Multiple Indian dances (thumka, RRR dance, classical) | **Interactive**: Select which dance |

## 🎯 How It Works

### 1. Prompt Analysis (Backend)

The system uses **OpenAI GPT-4o-mini** to analyze prompts and generate JSON:

```json
{
  "inferred_mechanic": "dance",
  "animation_candidates": ["dance", "twerk", "moonwalk"],
  "ordered_sequence": ["moonwalk", "twerk", "victoryJump"],
  "vibe": "silly",
  "control_suggestion": "button:twerk"
}
```

### 2. Animation Mapping Logic

The AI considers:

- **Emotional Context**: Sad prompts → crying animations, happy → dancing
- **Story Structure**: Beginning → middle → dramatic ending
- **Movement Keywords**: "went to work" → includes walk animations
- **Action Keywords**: "twerking" → suggests button-based control

### 3. Control Mode Selection

| Control Mode | When Used | Example |
|--------------|-----------|---------|
| **auto** | Story-based prompts that play like a movie | "i hate my life" |
| **movement** | User controls direction during sequence | Walking/running prompts |
| **button:ACTION** | Single action triggered by button | "twerking on the moon" |
| **interactive** | Multiple action buttons | "dance challenge" |

### 4. Animation Sequencing (Frontend)

- **Movement Animations** (walk, run, jump): Controls enabled, character stays centered, background scrolls
- **Auto-play Animations** (dance, attack, emote): Controls disabled, animation plays automatically
- Smart crossfading between animations (0.35s blend time)
- Duration-based timing: Movement animations play longer (10s+), emotes play once (~2s)

## 🎨 Available Animations

### Face Animations (20)
`blush`, `cringe`, `deadpan`, `eyeRoll`, `gasp`, `gigaGrin`, `grinLaughing`, `mindBlown`, `moneyEye`, `pleading`, `rage`, `side-eye`, `smirk`, `surprise`, `suspicious`, `sweat`, `uglyCry`, `villain-grin`

### Indian Dances (14)
`classicalDance`, `indianDance2`, `panjabaiDance2`, `panjabiDance`, `panjabiNew`, `rrrDance`, `rrrDance2`, `rrrDance3`, `thumka`, `thumka2`, `vickyKaushalDance`, `vickyKaushalDance2`

### Meme Beats (9)
`dramaticCollapse`, `faint`, `headBang`, `Kneel`, `moonwalk`, `stomp`, `tipToe`, `Tpose`, `victoryJump`

### Upper Body (20)
`airQuotes`, `backFlipCartwheel`, `claping`, `dab`, `DanceWithMicrophone`, `facepalm`, `facepalmBothHand`, `fingerWag`, `fistPump`, `foreheadWipe`, `hands on hips`, `jazz hands`, `micDrop`, `point`, `rapping`, `shrug`, `strut2`

### Full Body (60+)
`walk`, `run`, `jump`, `twerk`, `idle`, `sleeping`, `sleepStanding`, `dance`, `dance2`, `kick`, `punch`, `backFlip`, `moonwalk`, `fly`, `crawl`, `eat`, `laughing2`, and many more...

## 🏗️ Architecture

```
┌─────────────────┐
│   Web Browser   │  (Phaser + Spine)
│  (public/*.js)  │
└────────┬────────┘
         │ HTTP Request
         ↓
┌─────────────────┐
│  FastAPI Server │  (Python)
│   (app/main.py) │
└────────┬────────┘
         │
         ↓
┌─────────────────────┐
│  Prompt Processor   │  (OpenAI GPT-4o-mini)
│ (prompt_processor)  │  • Analyzes prompt
└─────────────────────┘  • Maps to animations
                         • Suggests controls
```

## 🎮 Controls

- **Keyboard**: 
  - `A` / `D` - Move left/right (during movement animations)
  - `W` - Jump
  
- **Touch**: 
  - Left joystick - Move character
  - Right button - Jump
  - Action buttons appear based on prompt

## 📁 Project Structure

```
Animation/
├── app/
│   ├── api/
│   │   └── router.py          # API endpoints
│   ├── core/
│   │   ├── config.py          # Configuration
│   │   └── prompt_processor.py # OpenAI prompt analysis
│   ├── models/
│   │   └── sequence.py        # Pydantic models
│   └── main.py                # FastAPI app
├── public/
│   ├── index.html             # Web UI
│   └── player.js              # Phaser game engine + controls
├── assets/
│   ├── skeleton/skeleton1/    # Spine character files
│   ├── background/            # Background images
│   └── music/                 # Audio files
├── shared/lib/                # Phaser & Spine libraries
├── server.py                  # Server entry point
├── test_prompts.py            # Test script for examples
└── requirements.txt           # Python dependencies
```

## 🧪 Testing

Run the test script to verify example prompts:

```bash
python test_prompts.py
```

This tests:
1. Donald Trump twerking on the moon
2. I just went to work I hate my life
3. A dance challenge

## 🔧 Customization

### Adding New Animations

1. Add Spine files to `assets/skeleton/`
2. Update `ANIMATIONS` list in `app/core/prompt_processor.py`
3. AI will automatically incorporate new animations

### Adjusting Sequence Length

Edit `SYSTEM_PROMPT` in `prompt_processor.py`:
```python
"ordered_sequence": [<3–6 animation names>]  # Change range here
```

### Modifying Control Behavior

Edit `isMovementAnimation()` in `public/player.js` to change which animations enable user controls.

## 🐛 Troubleshooting

**Issue**: Animations not found
- **Fix**: Check animation names match Spine skeleton exactly (case-sensitive)

**Issue**: Controls not working
- **Fix**: Movement controls only work during walk/run/jump animations (by design)

**Issue**: Server won't start
- **Fix**: Ensure OpenAI API key is set and virtual environment is activated

**Issue**: Sequence doesn't match prompt
- **Fix**: The AI learns from examples - try more specific prompts or adjust `SYSTEM_PROMPT`

## 📋 Requirements

- Python 3.11+
- FastAPI
- OpenAI API access
- Modern web browser with WebGL support

## 🎯 Deliverables Checklist

- ✅ Working prototype (runs locally in browser)
- ✅ 3+ prompt examples that generate mini-games
- ✅ README explaining prompt → animation mapping
- ✅ Controls selected based on prompt context
- ✅ Uses all provided Spine animations
- ✅ Generates sequences in under 1 minute
- ✅ Interactive and non-interactive modes
- ✅ Matches vibe/feeling of prompt

## 📄 License

This is a prototype project for animation sequence generation.

## 🤝 Contributing

To improve prompt understanding, update the `SYSTEM_PROMPT` in `app/core/prompt_processor.py` with more examples and guidelines.

