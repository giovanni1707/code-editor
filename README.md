# Professional Code Editor - Interactive Tutorials

A feature-rich, web-based code editor designed for creating interactive coding tutorials with a typewriter effect. Supports HTML, CSS, and JavaScript with real-time rendering and syntax highlighting.

## 🌟 Features

### Core Functionality

- **Multiple View Modes**: Switch between Edit, Raw Code, and Rendered HTML views
- **Typewriter Effect**: Animated code display for tutorial presentations
- **Syntax Highlighting**: Powered by Prism.js with support for HTML, CSS, and JavaScript
- **Split View Mode**: Side-by-side comparison of two code snippets
- **Individual Panel Controls**: Each panel has its own toolbar with mode switches

### Settings Panel (⚙️)

Access the settings panel to customize your editor experience:

- **Line Numbers Toggle**: Show or hide line numbers in the editor
- **Split View Control**: Enable side-by-side comparison mode
- **Auto-Run Toggle**: Automatically start typewriter effect when switching modes
- **Font Size Adjustment**: Scale editor text from 10px to 24px
- **Theme Toggle**: Switch between dark and light modes

### Advanced Features

#### Theme System
- **Dark Mode**: Professional dark theme optimized for code editing
- **Light Mode**: Clean light theme for better readability in bright environments
- **Persistent Settings**: All preferences saved to localStorage

#### Code Visibility Controls
- **CSS Toggle**: Show/hide CSS code blocks in raw and rendered modes
- **JS Toggle**: Show/hide JavaScript code blocks
- **Smart Indicators**: Visual feedback for code visibility status

#### Playback Controls
- **Pause/Resume**: Control typewriter animation
- **Reset**: Restart animation from the beginning
- **Speed Control**: Adjust typing speed (10ms - 200ms)
- **Real-time Speed Adjustment**: Change speed during playback

#### Keyboard Shortcuts
- **Ctrl/Cmd + Enter**: Run or reset code execution
- **Ctrl/Cmd + S**: Open settings panel
- **Escape**: Close settings modal

#### User Interface
- **Responsive Design**: Works on desktop and tablet devices
- **Draggable Resizer**: Adjust panel widths in split view mode
- **Fullscreen Mode**: Maximize workspace for presentations
- **Modern UI**: Clean, professional interface with smooth transitions
- **Custom Scrollbars**: Styled scrollbars matching the theme

## 🚀 Getting Started

### Quick Start

1. Open `editor.html` in a modern web browser
2. Write your HTML, CSS, and JavaScript code in the editor
3. Click mode buttons to switch between Edit, Raw, and Rendered views
4. Enable Split View from settings for side-by-side comparison

### Basic Usage

#### Edit Mode
- Write and modify your code
- Line numbers sync with your typing
- Supports standard text editor shortcuts

#### Raw Code Mode
- View syntax-highlighted code with typewriter effect
- Toggle CSS visibility with the CSS status indicator
- Perfect for code demonstrations

#### Rendered HTML Mode
- See live preview of your HTML
- Styles are applied in real-time
- JavaScript code blocks displayed separately
- Toggle JS visibility as needed

## 📁 File Structure

```
Code Editor/
├── editor.html      # Main HTML structure and UI
├── app.js          # Application logic and functionality
└── README.md       # Documentation (this file)
```

## 🎨 Customization

### Theme Colors

The editor uses CSS custom properties for easy customization. Edit the `:root` and `.light-mode` selectors in `editor.html` to customize colors:

```css
:root {
  --bg-primary: #000920;
  --bg-secondary: #1a1a2e;
  --accent-color: #4CAF50;
  /* ... more variables */
}
```

### Demo Content

Modify the `loadDemoContent()` function in `app.js` to change the default code samples.

## 🔧 Technical Details

### Dependencies

- **Prism.js**: Syntax highlighting library
  - prism-tomorrow.css (dark theme)
  - prism.css (light theme)
  - Language components: Markup, JavaScript, CSS

### Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6+ support

### localStorage Usage

The editor stores user preferences in localStorage:
- Theme preference (dark/light)
- Font size
- Line numbers visibility
- Auto-run setting
- Split view state
- Typing speed
- Code visibility toggles

## 💡 Use Cases

1. **Coding Tutorials**: Present code with animated typewriter effect
2. **Live Demos**: Show code and rendered output side by side
3. **Code Comparison**: Compare two implementations in split view
4. **Teaching**: Step-by-step code walkthroughs with pause/resume
5. **Presentations**: Fullscreen mode for workshops and talks

## 🎯 Tips & Tricks

1. **Smooth Presentations**: Use the speed control to match your talking pace
2. **Focus Areas**: Use CSS/JS toggles to highlight specific code sections
3. **Side-by-Side Teaching**: Enable split view to show before/after code
4. **Dark Rooms**: Use dark mode for better visibility during presentations
5. **Quick Resets**: Press Ctrl+Enter to quickly restart animations

## 📝 Example Code Structure

```html
<style>
/* Your CSS styles here */
.my-class {
  property: value;
}
</style>

<div class="my-class">
  <!-- Your HTML content -->
</div>

<script>
// Your JavaScript code
const element = document.querySelector('.my-class');
console.log(element);
</script>
```

## 🐛 Known Limitations

- Script tags in rendered mode display code but don't execute for security
- Large files may cause performance issues with typewriter effect
- Split view works best on screens wider than 768px

## 🔐 Security

- HTML is safely rendered without executing embedded scripts
- XSS protection through HTML entity encoding
- No server-side code execution
- All processing happens client-side

## 🚧 Future Enhancements

- Export code to files
- Import code from files
- Code templates library
- Multiple theme options
- Code formatting/beautification
- Snippet sharing via URL
- Monaco Editor integration option

## 📄 License

This project is open source and available for educational and commercial use.

## 🤝 Contributing

Feel free to fork, modify, and enhance this editor for your specific needs.

## 💬 Support

For issues or feature requests, create a detailed description of your use case and requirements.

---

**Built with ❤️ for code educators and presenters**
