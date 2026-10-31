import {
  HelpCircle, Brain, MessageCircle, HandHeart, CheckCircle2,
  Medal, ThumbsUp, Star, Crown,
} from 'lucide-react';

// Keys must match the ids in server/utils/badges.js
export const BADGE_META = {
  'first-question': { label: 'First Doubt',    icon: HelpCircle,    desc: 'Asked your first question' },
  'curious-mind':   { label: 'Curious Mind',   icon: Brain,         desc: 'Asked 5 questions' },
  'first-answer':   { label: 'First Reply',    icon: MessageCircle, desc: 'Posted your first answer' },
  'helpful-hand':   { label: 'Helpful Hand',   icon: HandHeart,     desc: 'Posted 5 answers' },
  'problem-solver': { label: 'Problem Solver', icon: CheckCircle2,  desc: 'Had an answer accepted' },
  'hive-expert':    { label: 'Hive Expert',    icon: Medal,         desc: '5 accepted answers' },
  'crowd-favorite': { label: 'Crowd Favorite', icon: ThumbsUp,      desc: 'An answer with 5+ upvotes' },
  'rising-star':    { label: 'Rising Star',    icon: Star,          desc: 'Reached 50 reputation' },
  'hive-legend':    { label: 'Hive Legend',    icon: Crown,         desc: 'Reached 150 reputation' },
};

export const BADGE_IDS = Object.keys(BADGE_META);
