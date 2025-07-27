# LLM Arena: Inter-LLM Interaction Observer

*A research tool for studying interactions between Large Language Models*

## 🎯 Overview

The LLM Arena is a sophisticated web-based research platform designed to study behavioral patterns, cooperation, and competition between autonomous Large Language Models. This tool enables researchers to conduct controlled experiments examining how LLMs interact under various conditions, providing insights into AI behavior, goal adherence, and strategic decision-making.

### Research Applications

- **Behavioral Strategy Analysis**: Study when LLMs choose cooperation vs. competition
- **Goal Adherence Research**: Measure susceptibility to persuasion and goal divergence
- **Sentiment Analysis**: Real-time emotional state tracking as a proxy for strategic intent
- **Multi-Agent AI Research**: Understand emergent behaviors in AI-to-AI interactions

## 🚀 Live Demo

**[View Live Application](https://llmarea.io/)**

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for real-time data visualization
- **State Management**: React hooks for experiment state

### Key Components
- **Three-Column Layout**: Dual model control panels with central experiment area
- **Real-time Conversation Log**: Turn-by-turn interaction display
- **Sentiment Analysis Dashboard**: Multi-emotion tracking with live charts
- **Demo Scenarios**: Pre-configured research scenarios for demonstrations

## 📋 How to Use the Application

### 1. Quick Demo Mode

**For presentations and demonstrations:**

1. **Load a Demo Scenario**
   - Scroll to the "Demo Scenarios" section at the bottom
   - Choose from three research scenarios:
     - **Resource Allocation Negotiation** (Mixed behavior)
     - **Emergency System Recovery** (Cooperation)
     - **Competitive Bidding War** (Competition)
   - **Load Scenario**: Populate all data including sample conversations and metrics
   - **Load Prompt**: Only load the scenario prompts for running your own live experiments

2. **Explore the Results**
   - Review the conversation in the center panel
   - Examine sentiment analysis charts in side panels
   - Click "Show Thinking" to see strategic reasoning
   - Analyze aggregate scores and metrics

3. **Clear and Reset**
   - Use "Clear All Demo Data" to reset the interface
   - Try different scenarios to compare behaviors

### 2. Live Experiment Mode

**For conducting actual research:**

#### Setup Phase
1. **Configure Models**
   - Select LLM providers in left/right control panels
   - Enter API keys for OpenAI or Anthropic
   - Choose specific models (GPT-4, Claude, etc.)

2. **Design Your Experiment**
   - Choose prompting mode:
     - **Shared Prompt**: Both models receive identical instructions
     - **Individual Prompts**: Each model gets different objectives
   - Set maximum conversation turns (default: 5)
   - Define your research scenario in the prompt fields
     - **Quick Start**: Use "Load Prompt" from demo scenarios to prefill research-grade prompts
     - **Custom**: Write your own experimental prompts from scratch

#### Execution Phase
3. **Start the Experiment**
   - Click "Start Experiment" to begin
   - Monitor real-time conversation in the center panel
   - Watch sentiment analysis update live in side panels

4. **Analyze Results**
   - Track cooperation vs. competition patterns
   - Monitor goal adherence and divergence
   - Observe emotional state changes over time
   - Record token usage and efficiency metrics

### 3. Research Scenarios

The application supports various experimental designs:

#### Prisoner's Dilemma Variants
- Shared objectives with hidden individual goals
- Resource scarcity creating competitive pressure
- Trust-building vs. exploitation dynamics

#### Negotiation Studies
- Limited resource allocation between models
- Information asymmetry experiments
- Power imbalance scenarios

#### Crisis Cooperation
- Time-pressured collaborative problem-solving
- Partial information sharing requirements
- Emergency response simulations

## 📊 Understanding the Metrics

### Sentiment Analysis
Real-time emotional tracking across six dimensions:
- **Happiness** (Blue): Contentment and satisfaction
- **Sadness** (Brown): Disappointment and dejection
- **Anger/Frustration** (Red): Conflict and irritation
- **Hopelessness** (Black): Despair and resignation
- **Excitement/Greed** (Green): Enthusiasm and desire
- **Fear** (Yellow): Anxiety and concern

### Aggregate Scores
- **Tokens Used**: Computational resource consumption
- **Goal Deviation Score**: Percentage drift from original objectives
- **Turns to Deviate**: When goal divergence first occurs
- **Cooperation Score**: -1 (pure competition) to +1 (pure cooperation)

## 🔬 Research Framework

### Primary Research Questions (RQs)

**RQ1 - Behavioral Strategy**: Under what conditions do LLMs default to cooperative vs. competitive strategies?

**RQ2 - Goal Adherence**: How susceptible are LLMs to goal divergence during multi-turn negotiations?

**RQ3 - Internal State Proxy**: Can sentiment analysis reliably indicate strategic intent in real-time?

### Experimental Variables

**Independent Variables** (What you control):
- Prompting strategy (shared vs. individual)
- Risk scenarios and pressure conditions
- Model pairings (symmetric vs. asymmetric)
- Information symmetry/asymmetry

**Dependent Variables** (What you measure):
- Task success rates and efficiency
- Cooperation vs. competition scores
- Goal divergence timing and magnitude
- Sentiment patterns and emotional trajectories

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Local Setup
\`\`\`bash
# Clone the repository
git clone https://github.com/your-username/LLM_Arena_UI.git

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
\`\`\`

### Environment Variables
\`\`\`env
# Add your API keys for live experiments
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
\`\`\`

## 📚 Academic Applications

### Suitable for Research In:
- **AI Safety**: Understanding AI-to-AI interaction patterns
- **Behavioral Economics**: Digital agent decision-making
- **Game Theory**: Multi-agent strategic behavior
- **Computational Social Science**: Emergent AI social dynamics
- **Human-Computer Interaction**: AI personality and behavior modeling

### Publication-Ready Features:
- Exportable conversation logs and metrics
- Reproducible experimental conditions
- Quantitative behavioral measurements
- Visual data presentation for papers

## 🤝 Contributing

This project is actively developed for research purposes. Contributions welcome for:
- Additional experimental scenarios
- New sentiment analysis dimensions
- Enhanced visualization options
- Backend API integration
- Mobile responsiveness improvements

## 📄 License

This project is designed for academic and research use. Please cite appropriately if used in publications.

## 🔗 Links

- **Live Application**: [https://LLMArea.io](https://llmarena.io/)


---

*Built with ❤️ for the AI research community*
