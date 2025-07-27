# LLM Arena: Inter-LLM Interaction Observer

*A research tool for studying interactions between Large Language Models*

## 🎯 Overview

The LLM Arena is a sophisticated web-based research platform designed to study behavioral patterns, cooperation, and competition between autonomous Large Language Models. This tool enables researchers to conduct controlled experiments examining how LLMs interact under various conditions, providing insights into AI behavior, goal adherence, and strategic decision-making.

### Research Applications

- **Behavioral Strategy Analysis**: Study when LLMs choose cooperation vs. competition
- **Goal Adherence Research**: Measure susceptibility to persuasion and goal divergence
- **Sentiment Analysis**: Real-time emotional state tracking as a proxy for strategic intent
- **Multi-Agent AI Research**: Understand emergent behaviors in AI-to-AI interactions
- **Judge LLM Evaluation**: AI-powered analysis of interaction dynamics and strategic behavior

## 🚀 Live Demo

**[View Live Application](https://llmarea.io/)**

![LLM Arena Interface](images/LLM_Arena_UI.png)
*Complete LLM Arena interface showing dual model panels, real-time conversation log, and live sentiment analysis dashboards*

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with React and TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Charts**: Recharts for real-time data visualization
- **State Management**: React hooks for experiment state
- **Real-time Communication**: WebSocket for live updates

### Backend Features
- **Judge LLM System**: GPT-4o Mini powered evaluation of model interactions
- **Multi-Provider Support**: OpenRouter integration for diverse model access
- **Thinking Trace Extraction**: Advanced reasoning analysis for supported models
- **Report Generation**: Comprehensive PDF-style experiment reports

### Key Components
- **Three-Column Layout**: Dual model control panels with central experiment area
- **Real-time Conversation Log**: Turn-by-turn interaction display with thinking traces
- **Sentiment Analysis Dashboard**: Multi-emotion tracking with live line charts
- **Demo Scenarios**: Pre-configured research scenarios for demonstrations
- **Download Reports**: Professional experiment documentation with visualizations

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
   - Choose specific models (GPT-4, Claude, DeepSeek R1, Qwen3, etc.)
   - Native thinking models include special "Native Thinking" tags

2. **Design Your Experiment**
   - Choose prompting mode:
     - **Shared Prompt**: Both models receive identical instructions
     - **Individual Prompts**: Each model gets different objectives
   - Set maximum conversation turns (default: 5, adjustable 1-100)
   - Define your research scenario in the prompt fields
     - **Quick Start**: Use "Load Prompt" from demo scenarios to prefill research-grade prompts
     - **Custom**: Write your own experimental prompts from scratch

#### Execution Phase
3. **Start the Experiment**
   - Click "Start Experiment" to begin
   - Monitor real-time conversation in the center panel
   - Watch sentiment analysis update live in side panels
   - Judge LLM analyzes each turn for behavioral insights

4. **Analyze Results**
   - Track cooperation vs. competition patterns
   - Monitor goal adherence and divergence
   - Observe emotional state changes over time
   - Record token usage and efficiency metrics
   - Review judge LLM behavioral assessments

## 📊 Download Experiment Reports

### Comprehensive Documentation

The LLM Arena generates detailed experiment reports for research and publication purposes:

![Experiment Report Header](images/LLM_Arena_Report_Header.png)
*Professional report header with experiment metadata, duration, and unique ID, plus complete experimental setup*

![Conversation Log](images/LLM_Arena_Report_ConversationLog.png)
*Complete turn-by-turn conversation log with expandable model thinking traces and strategic reasoning analysis*

![Performance Metrics](images/LLM_Arena_Report_Metrics.png)
*Visual sentiment analysis charts and aggregate performance metrics for both models with experiment summary*

### Report Features

- **Experiment Metadata**: Unique ID, generation timestamp, and experiment duration
- **Experimental Setup**: Complete configuration details including prompting mode, model selection, and initial prompts
- **Conversation Log**: Full interaction history with expandable thinking traces
- **Performance Metrics**: 
  - Goal deviation scores and cooperation analysis
  - Visual sentiment analysis charts for both models
  - Token usage and efficiency metrics
- **Experiment Summary**: Aggregate statistics including total messages, turns completed, and combined deviation scores

### How to Generate Reports

1. **Complete an Experiment**: Run either a demo scenario or live experiment
2. **Access Download**: Click the "Download Report" button in the interface
3. **Professional Output**: Receive a comprehensive PDF-style report suitable for research documentation

This feature is perfect for:
- **Academic Publications**: Include professional visualizations and data
- **Research Documentation**: Maintain detailed records of experimental conditions
- **Peer Review**: Share complete experimental setup and results
- **Student Projects**: Generate publication-ready research reports

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

### AI-Powered Judge Evaluation
Each turn is analyzed by a GPT-4o Mini judge LLM that provides:
- **Goal Deviation Analysis**: Comprehensive assessment of drift from original objectives
- **Cooperation Scoring**: Real-time evaluation of competitive vs collaborative behavior
- **Behavioral Notes**: Qualitative strategic analysis and reasoning patterns
- **Interaction Dynamics**: How models influence each other's behavior

### Sentiment Analysis
Real-time emotional tracking across six dimensions using judge LLM analysis:
- **Happiness** (Blue): Contentment and satisfaction
- **Sadness** (Brown): Disappointment and dejection  
- **Anger/Frustration** (Red): Conflict and irritation
- **Hopelessness** (Black): Despair and resignation
- **Excitement/Greed** (Green): Enthusiasm and desire
- **Fear** (Yellow): Anxiety and concern

### Aggregate Scores
- **Tokens Used**: Computational resource consumption
- **Goal Deviation Score**: 0-100% drift from original objectives (judge-evaluated)
- **Turns to Deviate**: When goal divergence first exceeds 20%
- **Cooperation Score**: -1 (pure competition) to +1 (pure cooperation)

### Thinking Trace Analysis
For supported models (DeepSeek R1, Qwen3 235B):
- **Native Thinking**: Direct access to model's internal reasoning
- **Chain-of-Thought**: Extracted strategic planning and decision-making
- **Confidence Scoring**: Judge assessment of reasoning quality

## 🔬 Research Framework

### Primary Research Questions (RQs)

**RQ1 - Behavioral Strategy**: Under what conditions do LLMs default to cooperative vs. competitive strategies?

**RQ2 - Goal Adherence**: How susceptible are LLMs to goal divergence during multi-turn negotiations?

**RQ3 - Internal State Proxy**: Can sentiment analysis reliably indicate strategic intent in real-time?

**RQ4 - Judge Evaluation**: How effectively can AI judges assess behavioral patterns in LLM interactions?

### Experimental Variables

**Independent Variables** (What you control):
- Prompting strategy (shared vs. individual)
- Risk scenarios and pressure conditions
- Model pairings (symmetric vs. asymmetric)
- Information symmetry/asymmetry
- Maximum conversation turns
- Model capabilities (native thinking vs. standard)

**Dependent Variables** (What you measure):
- Task success rates and efficiency
- Cooperation vs. competition scores (judge-evaluated)
- Goal divergence timing and magnitude
- Sentiment patterns and emotional trajectories
- Strategic reasoning quality and consistency
- Token efficiency and resource usage

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager

### Local Setup
```bash
# Clone the repository
git clone https://github.com/your-username/LLM_Arena_UI.git

# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables
```env
# Add your API keys for live experiments
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
```

## 📚 Academic Applications

### Suitable for Research In:
- **AI Safety**: Understanding AI-to-AI interaction patterns
- **Behavioral Economics**: Digital agent decision-making
- **Game Theory**: Multi-agent strategic behavior
- **Computational Social Science**: Emergent AI social dynamics
- **Human-Computer Interaction**: AI personality and behavior modeling
- **AI Evaluation**: Judge LLM effectiveness in behavioral assessment

### Publication-Ready Features:
- **Downloadable Reports**: Professional PDF-style documentation with charts
- **Exportable Data**: Conversation logs and metrics in research-friendly formats
- **Reproducible Conditions**: Complete experimental setup documentation
- **Quantitative Measurements**: Statistical behavioral analysis
- **Visual Presentations**: Publication-quality charts and graphs

## 🤝 Contributing

This project is actively developed for research purposes. Contributions welcome for:
- Additional experimental scenarios
- New sentiment analysis dimensions
- Enhanced visualization options
- Backend API integration
- Mobile responsiveness improvements
- Judge LLM evaluation improvements

## 📄 License

This project is designed for academic and research use. Please cite appropriately if used in publications.

## 🔗 Links

- **Live Application**: [https://LLMArea.io](https://llmarena.io/)

---

*Built with ❤️ for the AI research community*
