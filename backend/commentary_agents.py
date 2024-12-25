import autogen
from autogen import AssistantAgent, UserProxyAgent
import json
import google.generativeai as genai

# Configure API (you'll need to set your API key)
genai.configure(api_key="API-KEY") # Set your API key here

class Agent(AssistantAgent):
    def __init__(self, name, system_message, **kwargs):
        # Modify the config to work with Autogen's expectations
        config = {
            "config_list": [{
                "model": "gemini-1.5-flash",
                "api_type": "google",
                "base_url": None,
                "api_key": "API-KEY" # Set your API key here
            }],
            "temperature": kwargs.get('temperature', 0.5),
            "max_tokens": 8192
        }
        
        super().__init__(
            name=name, 
            system_message=system_message, 
            llm_config=config
        )

def create_commentary_panel():
    # Load agent configurations from JSON
    with open('./autogen_agents/agent_James_Jimmy_Carter.json', 'r') as f:
        jimmy_config = json.load(f)
    
    with open('./autogen_agents/agent_Mike_Reynolds.json', 'r') as f:
        mike_config = json.load(f)
    
    with open('./autogen_agents/agent_Event_Relay.json', 'r') as f:
        event_relay_config = json.load(f)

    # Create commentary agents
    jimmy = Agent(
        **jimmy_config['config']
    )

    mike = Agent(
        **mike_config['config']
    )

    # Create a user proxy to mediate event relay
    # event_relay = UserProxyAgent(
    #     **event_relay_config['config']
    # )
    event_relay = UserProxyAgent(
        name="Event_Relay",
        code_execution_config={"use_docker": False},
        system_message="You are the event relay agent. Pass game events to the commentary panel and manage the conversation flow.",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=5
    )

    # Define the group chat
    groupchat = autogen.GroupChat(
        agents=[event_relay, jimmy, mike], 
        messages=[],
        max_round=5
    )

    # Create the group chat manager
    manager = autogen.GroupChatManager(groupchat=groupchat)

    return {
        'panel': groupchat,
        'manager': manager,
        'event_relay': event_relay,
        'commentators': [jimmy, mike]
    }

def process_game_event(commentary_panel, event_json):
    """
    Process a game event through the commentary panel
    
    Args:
        commentary_panel (dict): The created commentary panel
        event_json (str or dict): The game event to be commentated
    
    Returns:
        list: Commentaries from different agents
    """
    # Ensure event is a JSON string
    if not isinstance(event_json, str):
        event_json = json.dumps(event_json)

    # Initiate conversation through event relay
    commentary_panel['event_relay'].initiate_chat(
        recipient=commentary_panel['manager'],
        message=f"New game event received: {event_json}"
    )
    print()

    # Collect and return commentaries
    commentaries = []
    for obj in commentary_panel['manager'].groupchat.messages:
        # Get last message and ensure it's a string
        
        if obj.get('name') == 'Event_Relay':
            continue

        msg = obj.get('content')

        commentaries.append({
            'commentator': obj.get('name'),
            'commentary': msg
        })


    return commentaries