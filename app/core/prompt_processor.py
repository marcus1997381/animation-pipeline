import json
from openai import OpenAI
from app.core.config import settings

_client = None

def get_client():
    global _client
    if _client is None:
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client

ANIMATIONS = [
    # faceAnimation
    "blush","blush2","cringe","deadpan","eyeRoll","gasp","gigaGrin","grinLaughing","mindBlown","moneyEye",
    "pleading","rage","rage2","side-eye","smirk","surprise","suspicious","sweat","uglyCry","villain-grin",
    # indianDances
    "classicalDance","indianDance2","panjabaiDance2","panjabiDance","panjabiNew","panjabiNew2",
    "rrrDance","rrrDance1","rrrDance2","rrrDance3","thumka","thumka2","vickyKaushalDance","vickyKaushalDance2",
    # memeBeats
    "dramaticCollapse","faint","headBang","Kneel","moonwalk","stomp","tipToe","Tpose","victoryJump",
    # UpperBodyBits
    "airQuotes","backFlipCartwheel","claping","claping2","dab","DanceWithMicrophone","facepalm","facepalmBothHand",
    "fingerWag","fistPump","foreheadWipe","hands on hips","jazz hands","micDrop","point","point2","pointDouble",
    "rapping","shrug","strut2",
    # general
    "angereffect","aura farmer","backFlip","ballDribling","ball kick","block","blockCrouch","busketball",
    "busketBallThrow","catchRun","catchRun2","chefsKiss","comeHere","crawl","crawlBackwards","cryingeffect",
    "dance","dance2","danceEmote","duck","eat","embarrassed","fairyFly","fairyFlyWithwandWave","fallPose",
    "fallPose2","flyHorizontalSuperman","flySuperman","Hadokun","hardHit","hip Twist","idle","jump","jumpInplace",
    "kick","kickingBallWithLeft","KickingBallWithRight","kickJumping","kickSitting","kickSitting2","knockOver",
    "laughing2","laughingEffect","leaningforward","lightHit","moneySplash","moneyThrow","punchJumping",
    "punch jumping","punchJumpingInplace","punchLeftHook","punchRightHook","punchSitting","recover","run",
    "runBackwards","scaredRun","scaredRun2","sleeping","sleepStanding","surprise","talkingeffect","twerk",
    "upperCut","walk","walkBackwards"
]

SYSTEM_PROMPT = f"""
    You are an animation director that converts free-text prompts into short, funny animation sequences.

    You must always respond in JSON format with this structure:
    {{
        "inferred_mechanic": "<string, e.g. dance, run, cry, fight, idle>",
        "animation_candidates": [<list of related animations>],
        "ordered_sequence": [<3–6 animation names that make narrative sense>],
        "vibe": "<emotional tone: happy, sad, angry, excited, neutral, silly, dramatic>",
        "control_suggestion": "<control type: auto, movement, button:ACTION, or interactive>"
    }}

    Available animations:
    {', '.join(ANIMATIONS)}

    Guidelines:
    - Understand the user's text emotionally and contextually.
    - Choose animations that fit the vibe and context.
    - Keep ordered_sequence between 3-6 animations that tell a story with a beginning, middle, and end.
    - Set "vibe" to match the emotional tone (e.g., sad for "i hate my life", silly for "twerking").
    - Set "control_suggestion":
      * "auto" = animations play automatically in sequence (default for most story-based prompts)
      * "movement" = user controls walking/running/jumping during the sequence
      * "button:ACTION" = create a clickable button to trigger ACTION (e.g., "button:twerk" for "donald trump twerking")
      * "interactive" = create buttons for multiple actions the user can choose (e.g., "dance challenge")
    - For story-based prompts with movement (like "went to work", "walking somewhere"), include walk/run animations at the start.
    - For dramatic endings, include impactful final animations (like micDrop, faint, victoryJump, dramaticCollapse).
    - Mix animation types to tell better stories: movement (walk, run) + emotion (face animations) + action (micDrop, dance).
    - For prompts about specific actions (like "twerking", "dancing with button"), suggest button-based control.
    - For challenges or selections (like "dance challenge"), use "interactive" mode.
    - Be coherent, funny, and expressive.
    - If unsure, default to ordered_sequence: ['idle'], vibe: "neutral", control_suggestion: "auto".
    - Never output plain text — only JSON.
"""

def map_prompt_to_json(prompt: str):
    client = get_client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0.8,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ]
    )

    raw = response.choices[0].message.content.strip()
    try:
        result = json.loads(raw)
    except Exception:
        # fallback
        result = {
            "inferred_mechanic": "idle", 
            "animation_candidates": ["idle"], 
            "ordered_sequence": ["idle"],
            "vibe": "neutral",
            "control_suggestion": "auto"
        }
    return result

def create_sequence(prompt: str) -> dict:
    """
    Returns full response with animation sequence, vibe, and control suggestions.
    """
    result = map_prompt_to_json(prompt)
    print(json.dumps(result, indent=2))
    return result