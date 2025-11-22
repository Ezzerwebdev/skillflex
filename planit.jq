def from_root:
  if type=="array" then .
  else .activities? // .data? // []
  end;

def only_y3_spelling:
  map(select(.subject=="english" and (.year|tostring)=="3" and .topic=="spelling"));

def only_level($L): map(select((.level // "") == $L));

def chunk($n):
  def go(s):
    if (s|length)==0 then []
    else [ s[:$n] ] + go(s[$n:])
    end;
  go(.);
  
# entry
($acts[0] | from_root | only_y3_spelling | only_level($level) | sort_by(.title, .id)) as $A
| {
    pathTitle: ("Y3 · Spelling · " + (if $level=="seedling" then "Warm-Up"
                                     elif $level=="sprout" then "Ready"
                                     else "Challenge!" end)),
    units:
      ($A | chunk(5) | to_entries
          | map({
              id:    ("u" + ((.key+1)|tostring)),
              title: ("Unit " + ((.key+1)|tostring)),
              emoji: "🔡",
              lessons: (.value | map({id:.id, title:.title}))
            }))
  }
