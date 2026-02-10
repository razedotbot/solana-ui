/**
 * Shared modal CSS styles used across multiple modal/panel components.
 *
 * Contains the union of all common keyframe animations, class selectors,
 * and responsive rules so each component can inject them once via a
 * <style> element without duplicating the CSS.
 */
export const MODAL_STYLES = `
  /* ── Core keyframe animations ─────────────────────────────────────── */

  @keyframes modal-pulse {
    0% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
    50% { box-shadow: 0 0 15px var(--color-primary-80), 0 0 25px var(--color-primary-40); }
    100% { box-shadow: 0 0 5px var(--color-primary-50), 0 0 15px var(--color-primary-20); }
  }

  @keyframes modal-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes modal-slide-up {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes modal-scan-line {
    0% { transform: translateY(-100%); opacity: 0.3; }
    100% { transform: translateY(100%); opacity: 0; }
  }

  /* ── Layout ───────────────────────────────────────────────────────── */

  .modal-content {
    position: relative;
  }

  /* ── Input / button / progress-bar cyber styles ───────────────────── */

  .modal-input-:focus {
    box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
    transition: all 0.3s ease;
  }

  .modal-input-cyber:focus {
    box-shadow: 0 0 0 1px var(--color-primary-70), 0 0 15px var(--color-primary-50);
    transition: all 0.3s ease;
  }

  .modal-btn- {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .modal-btn-::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to bottom right,
      transparent 0%,
      var(--color-primary-30) 50%,
      transparent 100%
    );
    transform: rotate(45deg);
    transition: all 0.5s ease;
    opacity: 0;
  }

  .modal-btn-:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(50%, 50%);
  }

  .modal-btn-:active {
    transform: scale(0.95);
  }

  .modal-btn-cyber {
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
  }

  .modal-btn-cyber::after {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to bottom right,
      transparent 0%,
      var(--color-primary-30) 50%,
      transparent 100%
    );
    transform: rotate(45deg);
    transition: all 0.5s ease;
    opacity: 0;
  }

  .modal-btn-cyber:hover::after {
    opacity: 1;
    transform: rotate(45deg) translate(50%, 50%);
  }

  .modal-btn-cyber:active {
    transform: scale(0.95);
  }

  .progress-bar- {
    position: relative;
    overflow: hidden;
  }

  .progress-bar-::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-primary-70) 50%,
      transparent 100%
    );
    width: 100%;
    height: 100%;
    transform: translateX(-100%);
    animation: progress-shine 3s infinite;
  }

  .progress-bar-cyber {
    position: relative;
    overflow: hidden;
  }

  .progress-bar-cyber::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--color-primary-70) 50%,
      transparent 100%
    );
    width: 100%;
    height: 100%;
    transform: translateX(-100%);
    animation: progress-shine 3s infinite;
  }

  @keyframes progress-shine {
    0% { transform: translateX(-100%); }
    20% { transform: translateX(100%); }
    100% { transform: translateX(100%); }
  }

  /* ── Glitch text effect ───────────────────────────────────────────── */

  .glitch-text:hover {
    text-shadow: 0 0 2px var(--color-primary), 0 0 4px var(--color-primary);
    animation: glitch 2s infinite;
  }

  @keyframes glitch {
    2%, 8% { transform: translate(-2px, 0) skew(0.3deg); }
    4%, 6% { transform: translate(2px, 0) skew(-0.3deg); }
    62%, 68% { transform: translate(0, 0) skew(0.33deg); }
    64%, 66% { transform: translate(0, 0) skew(-0.33deg); }
  }

  /* ── Step transition animations ───────────────────────────────────── */

  @keyframes modal-in {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes step-out {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(-20px); opacity: 0; }
  }

  @keyframes step-in {
    0% { transform: translateX(20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes step-back-out {
    0% { transform: translateX(0); opacity: 1; }
    100% { transform: translateX(20px); opacity: 0; }
  }

  @keyframes step-back-in {
    0% { transform: translateX(-20px); opacity: 0; }
    100% { transform: translateX(0); opacity: 1; }
  }

  @keyframes content-fade {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes fadeIn {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }

  @keyframes scale-in {
    0% { transform: scale(0); }
    100% { transform: scale(1); }
  }

  .animate-modal-in {
    animation: modal-in 0.5s ease-out forwards;
  }

  .animate-step-out {
    animation: step-out 0.3s ease-out forwards;
  }

  .animate-step-in {
    animation: step-in 0.3s ease-out forwards;
  }

  .animate-step-back-out {
    animation: step-back-out 0.3s ease-out forwards;
  }

  .animate-step-back-in {
    animation: step-back-in 0.3s ease-out forwards;
  }

  .animate-content-fade {
    animation: content-fade 0.5s ease forwards;
  }

  .animate-pulse-slow {
    animation: pulse-slow 2s infinite;
  }

  @keyframes pulse-slow {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.7; }
  }

  /* ── Data-transfer animation (ConsolidatePanel) ───────────────────── */

  @keyframes data-transfer {
    0% { transform: translateY(0); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(20px); opacity: 0; }
  }

  .data-flow {
    position: relative;
    overflow: hidden;
  }

  .data-flow::before {
    content: "";
    position: absolute;
    height: 6px;
    width: 6px;
    background-color: var(--color-primary-70);
    border-radius: 50%;
    top: 30%;
    left: 50%;
    animation: data-transfer 2s infinite;
    opacity: 0;
  }

  /* ── Scrollbar styling ────────────────────────────────────────────── */

  .modal-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .modal-scrollbar::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: 3px;
  }

  .modal-scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: 3px;
  }

  .modal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary);
  }

  .scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
    border-radius: 3px;
  }

  .scrollbar::-webkit-scrollbar-thumb {
    background: var(--color-scrollbar-thumb);
    border-radius: 3px;
  }

  .scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary);
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: var(--color-bg-tertiary);
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: 2px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: var(--color-primary-dark);
  }

  /* ── Responsive styles ────────────────────────────────────────────── */

  @media (max-width: 768px) {
    .modal-content {
      width: 95% !important;
      max-height: 90vh;
      overflow-y: auto;
    }
  }
`;
