#!/usr/bin/env python3
"""
Test script to verify the three example prompts generate correct outputs
"""
import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.prompt_processor import create_sequence

def test_prompt(prompt: str, expected_desc: str):
    """Test a prompt and display the result"""
    print(f"\n{'='*80}")
    print(f"PROMPT: {prompt}")
    print(f"EXPECTED: {expected_desc}")
    print(f"{'='*80}")
    
    try:
        result = create_sequence(prompt)
        print(f"\n✅ Result:")
        print(f"   Ordered Sequence: {result.get('ordered_sequence', [])}")
        print(f"   Vibe: {result.get('vibe', 'N/A')}")
        print(f"   Control Suggestion: {result.get('control_suggestion', 'N/A')}")
        print(f"   Inferred Mechanic: {result.get('inferred_mechanic', 'N/A')}")
        
        # Validate expectations
        sequence = result.get('ordered_sequence', [])
        control = result.get('control_suggestion', '')
        
        if len(sequence) < 3:
            print(f"\n⚠️  WARNING: Sequence has only {len(sequence)} animations (expected 3-6)")
        else:
            print(f"\n✓ Sequence length OK: {len(sequence)} animations")
        
        return result
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Run all test prompts"""
    print("\n" + "="*80)
    print("TESTING EXAMPLE PROMPTS FROM SPEC")
    print("="*80)
    
    # Test 1: Donald Trump twerking
    test_prompt(
        "donald trump twerking on the moon",
        "dancing sequence with button to twerk"
    )
    
    # Test 2: I hate my life
    test_prompt(
        "i just went to work i hate my life",
        "walking to office, sad face, crying, then mic drop"
    )
    
    # Test 3: Dance challenge
    test_prompt(
        "a dance challenge",
        "random dance loop where you select which dance you want"
    )
    
    print("\n" + "="*80)
    print("TEST COMPLETE")
    print("="*80)
    print("\nTo test in browser:")
    print("1. Run: python server.py")
    print("2. Open: http://localhost:3333")
    print("3. Try the prompts above")

if __name__ == "__main__":
    main()

