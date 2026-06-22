// ───────────────────────────────────────────────────────────────────────────
//  EkkoJS · Pure ESM JavaScript & TypeScript runtime
//
//  License      MIT
//  Copyright    © 2026 Ampla Network LLC
//  Contact      hello@e-mc2.dev
//
//  EkkoJS is the result of the whole team's effort. Enjoy using it!
// ───────────────────────────────────────────────────────────────────────────



#[cfg(test)]
mod tests {
    use crate::core::cell::{Cell, Col, Style};
    use crate::core::surface::Surface;

    fn apply(surface: &mut Surface, json: &str) {
        crate::bridge::apply_cell_updates_pub(surface, json);
    }

    #[test]
    fn box_single_border_5x3() {
        let mut s = Surface::new(5, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┌"},{"x":1,"y":0,"ch":"─"},{"x":2,"y":0,"ch":"─"},{"x":3,"y":0,"ch":"─"},{"x":4,"y":0,"ch":"┐"},
            {"x":0,"y":1,"ch":"│"},{"x":4,"y":1,"ch":"│"},
            {"x":0,"y":2,"ch":"└"},{"x":1,"y":2,"ch":"─"},{"x":2,"y":2,"ch":"─"},{"x":3,"y":2,"ch":"─"},{"x":4,"y":2,"ch":"┘"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("┌───┐"));
        assert!(text.contains("│   │"));
        assert!(text.contains("└───┘"));
    }

    #[test]
    fn box_double_border_7x4() {
        let mut s = Surface::new(7, 4);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"╔"},{"x":1,"y":0,"ch":"═"},{"x":2,"y":0,"ch":"═"},{"x":3,"y":0,"ch":"═"},{"x":4,"y":0,"ch":"═"},{"x":5,"y":0,"ch":"═"},{"x":6,"y":0,"ch":"╗"},
            {"x":0,"y":1,"ch":"║"},{"x":6,"y":1,"ch":"║"},
            {"x":0,"y":2,"ch":"║"},{"x":6,"y":2,"ch":"║"},
            {"x":0,"y":3,"ch":"╚"},{"x":1,"y":3,"ch":"═"},{"x":2,"y":3,"ch":"═"},{"x":3,"y":3,"ch":"═"},{"x":4,"y":3,"ch":"═"},{"x":5,"y":3,"ch":"═"},{"x":6,"y":3,"ch":"╝"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("╔═════╗"));
        assert!(text.contains("║     ║"));
        assert!(text.contains("╚═════╝"));
    }

    #[test]
    fn box_round_border_3x3_minimum() {
        let mut s = Surface::new(3, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"╭"},{"x":1,"y":0,"ch":"─"},{"x":2,"y":0,"ch":"╮"},
            {"x":0,"y":1,"ch":"│"},{"x":2,"y":1,"ch":"│"},
            {"x":0,"y":2,"ch":"╰"},{"x":1,"y":2,"ch":"─"},{"x":2,"y":2,"ch":"╯"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("╭─╮"));
        assert!(text.contains("│ │"));
        assert!(text.contains("╰─╯"));
    }

    #[test]
    fn box_bold_border_4x3() {
        let mut s = Surface::new(4, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┏"},{"x":1,"y":0,"ch":"━"},{"x":2,"y":0,"ch":"━"},{"x":3,"y":0,"ch":"┓"},
            {"x":0,"y":1,"ch":"┃"},{"x":3,"y":1,"ch":"┃"},
            {"x":0,"y":2,"ch":"┗"},{"x":1,"y":2,"ch":"━"},{"x":2,"y":2,"ch":"━"},{"x":3,"y":2,"ch":"┛"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("┏━━┓"));
        assert!(text.contains("┃  ┃"));
        assert!(text.contains("┗━━┛"));
    }

    #[test]
    fn box_with_colored_border() {
        let mut s = Surface::new(5, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┌","fg":"cyan"},{"x":1,"y":0,"ch":"─","fg":"cyan"},{"x":2,"y":0,"ch":"─","fg":"cyan"},{"x":3,"y":0,"ch":"─","fg":"cyan"},{"x":4,"y":0,"ch":"┐","fg":"cyan"},
            {"x":0,"y":1,"ch":"│","fg":"cyan"},{"x":4,"y":1,"ch":"│","fg":"cyan"},
            {"x":0,"y":2,"ch":"└","fg":"cyan"},{"x":1,"y":2,"ch":"─","fg":"cyan"},{"x":2,"y":2,"ch":"─","fg":"cyan"},{"x":3,"y":2,"ch":"─","fg":"cyan"},{"x":4,"y":2,"ch":"┘","fg":"cyan"}
        ]"#);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].1, Col::CYAN);
        assert_eq!(snap[1][4].1, Col::CYAN);
        assert_eq!(snap[2][2].1, Col::CYAN);
    }

    #[test]
    fn box_with_bg_fill() {
        let mut s = Surface::new(4, 2);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":" ","bg":"blue"},{"x":1,"y":0,"ch":" ","bg":"blue"},{"x":2,"y":0,"ch":" ","bg":"blue"},{"x":3,"y":0,"ch":" ","bg":"blue"},
            {"x":0,"y":1,"ch":" ","bg":"blue"},{"x":1,"y":1,"ch":" ","bg":"blue"},{"x":2,"y":1,"ch":" ","bg":"blue"},{"x":3,"y":1,"ch":" ","bg":"blue"}
        ]"#);
        let snap = s.snapshot();
        for y in 0..2 {
            for x in 0..4 {
                assert_eq!(snap[y][x].2, Col::BLUE, "cell ({},{}) bg should be blue", x, y);
            }
        }
    }

    #[test]
    fn text_plain() {
        let mut s = Surface::new(20, 1);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"H"},{"x":1,"y":0,"ch":"e"},{"x":2,"y":0,"ch":"l"},{"x":3,"y":0,"ch":"l"},{"x":4,"y":0,"ch":"o"}
        ]"#);
        let text = s.to_text();
        assert!(text.starts_with("Hello"));
    }

    #[test]
    fn text_bold_red() {
        let mut s = Surface::new(10, 1);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"E","fg":"red","style":"bold"},
            {"x":1,"y":0,"ch":"r","fg":"red","style":"bold"},
            {"x":2,"y":0,"ch":"r","fg":"red","style":"bold"}
        ]"#);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].0, 'E');
        assert_eq!(snap[0][0].1, Col::RED);
        assert_eq!(snap[0][0].3, Style::BOLD);
    }

    #[test]
    fn text_italic_green_on_black() {
        let mut s = Surface::new(5, 1);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"O","fg":"green","bg":"black","style":"italic"},
            {"x":1,"y":0,"ch":"K","fg":"green","bg":"black","style":"italic"}
        ]"#);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].1, Col::GREEN);
        assert_eq!(snap[0][0].2, Col::BLACK);
        assert_eq!(snap[0][0].3, Style::ITALIC);
    }

    #[test]
    fn text_rgb_colors() {
        let mut s = Surface::new(5, 1);
        apply(&mut s, r##"[
            {"x":0,"y":0,"ch":"R","fg":"#ff0000"},
            {"x":1,"y":0,"ch":"G","fg":"#00ff00"},
            {"x":2,"y":0,"ch":"B","fg":"#0000ff"}
        ]"##);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].1, Col::rgb(255, 0, 0));
        assert_eq!(snap[0][1].1, Col::rgb(0, 255, 0));
        assert_eq!(snap[0][2].1, Col::rgb(0, 0, 255));
    }

    #[test]
    fn text_multiline() {
        let mut s = Surface::new(10, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"L"},{"x":1,"y":0,"ch":"1"},
            {"x":0,"y":1,"ch":"L"},{"x":1,"y":1,"ch":"2"},
            {"x":0,"y":2,"ch":"L"},{"x":1,"y":2,"ch":"3"}
        ]"#);
        let text = s.to_text();
        let lines: Vec<&str> = text.lines().collect();
        assert!(lines[0].starts_with("L1"));
        assert!(lines[1].starts_with("L2"));
        assert!(lines[2].starts_with("L3"));
    }

    #[test]
    fn progress_bar_empty() {
        let mut s = Surface::new(10, 1);
        let bar: String = "░".repeat(10);
        let json = bar.chars().enumerate().map(|(i, ch)| {
            format!(r#"{{"x":{},"y":0,"ch":"{}","fg":"green"}}"#, i, ch)
        }).collect::<Vec<_>>().join(",");
        apply(&mut s, &format!("[{}]", json));
        let text = s.to_text();
        assert_eq!(text.trim(), "░░░░░░░░░░");
    }

    #[test]
    fn progress_bar_half() {
        let mut s = Surface::new(10, 1);
        let bar = "█████░░░░░";
        let json = bar.chars().enumerate().map(|(i, ch)| {
            format!(r#"{{"x":{},"y":0,"ch":"{}","fg":"green"}}"#, i, ch)
        }).collect::<Vec<_>>().join(",");
        apply(&mut s, &format!("[{}]", json));
        let text = s.to_text();
        assert!(text.contains("█████"));
        assert!(text.contains("░░░░░"));
    }

    #[test]
    fn progress_bar_full() {
        let mut s = Surface::new(10, 1);
        let bar = "██████████";
        let json = bar.chars().enumerate().map(|(i, ch)| {
            format!(r#"{{"x":{},"y":0,"ch":"{}","fg":"green"}}"#, i, ch)
        }).collect::<Vec<_>>().join(",");
        apply(&mut s, &format!("[{}]", json));
        let text = s.to_text();
        assert_eq!(text.trim(), "██████████");
    }

    #[test]
    fn spinner_dots_frames() {
        let frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
        for (i, frame) in frames.iter().enumerate() {
            let mut s = Surface::new(3, 1);
            apply(&mut s, &format!(r#"[{{"x":0,"y":0,"ch":"{}","fg":"cyan"}}]"#, frame));
            let snap = s.snapshot();
            assert_eq!(snap[0][0].0, frame.chars().next().unwrap(), "frame {} mismatch", i);
            assert_eq!(snap[0][0].1, Col::CYAN);
        }
    }

    #[test]
    fn spinner_line_frames() {
        let frames = ["-", "\\", "|", "/"];
        for frame in &frames {
            let mut s = Surface::new(3, 1);
            let ch = if *frame == "\\" { "\\\\" } else { frame };
            apply(&mut s, &format!(r#"[{{"x":0,"y":0,"ch":"{}","fg":"cyan"}}]"#, ch));
            let snap = s.snapshot();
            assert_eq!(snap[0][0].1, Col::CYAN);
        }
    }

    #[test]
    fn table_header_and_separator() {
        let mut s = Surface::new(20, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"│","style":"bold"},{"x":2,"y":0,"ch":"N","style":"bold"},{"x":3,"y":0,"ch":"a","style":"bold"},{"x":4,"y":0,"ch":"m","style":"bold"},{"x":5,"y":0,"ch":"e","style":"bold"},
            {"x":0,"y":1,"ch":"├"},{"x":1,"y":1,"ch":"─"},{"x":2,"y":1,"ch":"─"},{"x":3,"y":1,"ch":"─"},{"x":4,"y":1,"ch":"─"},{"x":5,"y":1,"ch":"─"},{"x":6,"y":1,"ch":"┤"},
            {"x":0,"y":2,"ch":"│"},{"x":2,"y":2,"ch":"A"},{"x":3,"y":2,"ch":"l"},{"x":4,"y":2,"ch":"i"},{"x":5,"y":2,"ch":"c"},{"x":6,"y":2,"ch":"e"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("Name"));
        assert!(text.contains("├"));
        assert!(text.contains("Alice"));
    }

    #[test]
    fn table_full_box_drawing() {
        let mut s = Surface::new(15, 5);

        

        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┌"},{"x":1,"y":0,"ch":"─"},{"x":2,"y":0,"ch":"─"},{"x":3,"y":0,"ch":"─"},{"x":4,"y":0,"ch":"─"},{"x":5,"y":0,"ch":"─"},{"x":6,"y":0,"ch":"┬"},{"x":7,"y":0,"ch":"─"},{"x":8,"y":0,"ch":"─"},{"x":9,"y":0,"ch":"─"},{"x":10,"y":0,"ch":"─"},{"x":11,"y":0,"ch":"─"},{"x":12,"y":0,"ch":"┐"},
            {"x":0,"y":1,"ch":"│"},{"x":2,"y":1,"ch":"A"},{"x":6,"y":1,"ch":"│"},{"x":8,"y":1,"ch":"B"},{"x":12,"y":1,"ch":"│"},
            {"x":0,"y":2,"ch":"├"},{"x":1,"y":2,"ch":"─"},{"x":2,"y":2,"ch":"─"},{"x":3,"y":2,"ch":"─"},{"x":4,"y":2,"ch":"─"},{"x":5,"y":2,"ch":"─"},{"x":6,"y":2,"ch":"┼"},{"x":7,"y":2,"ch":"─"},{"x":8,"y":2,"ch":"─"},{"x":9,"y":2,"ch":"─"},{"x":10,"y":2,"ch":"─"},{"x":11,"y":2,"ch":"─"},{"x":12,"y":2,"ch":"┤"},
            {"x":0,"y":3,"ch":"│"},{"x":2,"y":3,"ch":"1"},{"x":6,"y":3,"ch":"│"},{"x":8,"y":3,"ch":"2"},{"x":12,"y":3,"ch":"│"},
            {"x":0,"y":4,"ch":"└"},{"x":1,"y":4,"ch":"─"},{"x":2,"y":4,"ch":"─"},{"x":3,"y":4,"ch":"─"},{"x":4,"y":4,"ch":"─"},{"x":5,"y":4,"ch":"─"},{"x":6,"y":4,"ch":"┴"},{"x":7,"y":4,"ch":"─"},{"x":8,"y":4,"ch":"─"},{"x":9,"y":4,"ch":"─"},{"x":10,"y":4,"ch":"─"},{"x":11,"y":4,"ch":"─"},{"x":12,"y":4,"ch":"┘"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("┌─────┬─────┐"));
        assert!(text.contains("├─────┼─────┤"));
        assert!(text.contains("└─────┴─────┘"));
    }

    #[test]
    fn select_input_items() {
        let mut s = Surface::new(15, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"❯","fg":"cyan","style":"bold"},{"x":2,"y":0,"ch":"O","fg":"cyan","style":"bold"},{"x":3,"y":0,"ch":"n","fg":"cyan","style":"bold"},{"x":4,"y":0,"ch":"e","fg":"cyan","style":"bold"},
            {"x":2,"y":1,"ch":"T"},{"x":3,"y":1,"ch":"w"},{"x":4,"y":1,"ch":"o"},
            {"x":2,"y":2,"ch":"T"},{"x":3,"y":2,"ch":"h"},{"x":4,"y":2,"ch":"r"},{"x":5,"y":2,"ch":"e"},{"x":6,"y":2,"ch":"e"}
        ]"#);
        let snap = s.snapshot();
        
        assert_eq!(snap[0][0].0, '❯');
        assert_eq!(snap[0][0].1, Col::CYAN);
        assert_eq!(snap[0][0].3, Style::BOLD);
        
        assert!(snap[1][2].1.is_default());
    }

    #[test]
    fn layout_tiny_5x3() {
        let mut s = Surface::new(5, 3);
        
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┌"},{"x":1,"y":0,"ch":"─"},{"x":2,"y":0,"ch":"─"},{"x":3,"y":0,"ch":"─"},{"x":4,"y":0,"ch":"┐"},
            {"x":0,"y":1,"ch":"│"},{"x":1,"y":1,"ch":"H"},{"x":2,"y":1,"ch":"i"},{"x":4,"y":1,"ch":"│"},
            {"x":0,"y":2,"ch":"└"},{"x":1,"y":2,"ch":"─"},{"x":2,"y":2,"ch":"─"},{"x":3,"y":2,"ch":"─"},{"x":4,"y":2,"ch":"┘"}
        ]"#);
        let text = s.to_text();
        assert_eq!(text.lines().count(), 3);
        assert!(text.contains("Hi"));
        assert!(text.contains("┌───┐"));
    }

    #[test]
    fn layout_standard_80x25() {
        let mut s = Surface::new(80, 25);
        
        let mut cells = Vec::new();
        for x in 0..80 {
            cells.push(format!(r#"{{"x":{},"y":0,"ch":" ","bg":"blue"}}"#, x));
        }
        
        cells.push(r#"{"x":2,"y":0,"ch":"E","fg":"white","bg":"blue","style":"bold"}"#.to_string());
        cells.push(r#"{"x":3,"y":0,"ch":"k","fg":"white","bg":"blue","style":"bold"}"#.to_string());
        cells.push(r#"{"x":4,"y":0,"ch":"k","fg":"white","bg":"blue","style":"bold"}"#.to_string());
        cells.push(r#"{"x":5,"y":0,"ch":"o","fg":"white","bg":"blue","style":"bold"}"#.to_string());
        apply(&mut s, &format!("[{}]", cells.join(",")));
        let snap = s.snapshot();
        
        assert_eq!(snap[0][0].2, Col::BLUE);
        assert_eq!(snap[0][79].2, Col::BLUE);
        
        assert_eq!(snap[0][2].0, 'E');
        assert_eq!(snap[0][2].1, Col::WHITE);
        assert_eq!(snap[0][2].3, Style::BOLD);
        
        assert_eq!(snap[1][0].0, ' ');
        assert!(snap[1][0].2.is_default());
    }

    #[test]
    fn layout_wide_120x40() {
        let mut s = Surface::new(120, 40);
        
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"T","fg":"red"},
            {"x":119,"y":0,"ch":"R","fg":"green"},
            {"x":0,"y":39,"ch":"B","fg":"blue"},
            {"x":119,"y":39,"ch":"X","fg":"yellow"}
        ]"#);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].0, 'T');
        assert_eq!(snap[0][0].1, Col::RED);
        assert_eq!(snap[0][119].0, 'R');
        assert_eq!(snap[0][119].1, Col::GREEN);
        assert_eq!(snap[39][0].0, 'B');
        assert_eq!(snap[39][0].1, Col::BLUE);
        assert_eq!(snap[39][119].0, 'X');
        assert_eq!(snap[39][119].1, Col::YELLOW);
    }

    #[test]
    fn layout_narrow_20x5() {
        let mut s = Surface::new(20, 5);
        
        let bar = "████████░░░░░░░░░░░░";
        let json: Vec<String> = bar.chars().enumerate().map(|(i, ch)| {
            format!(r#"{{"x":{},"y":2,"ch":"{}","fg":"green"}}"#, i, ch)
        }).collect();
        apply(&mut s, &format!("[{}]", json.join(",")));
        let text = s.to_text();
        let lines: Vec<&str> = text.lines().collect();
        assert_eq!(lines.len(), 5);
        assert!(lines[2].contains("████████"));
        assert!(lines[2].contains("░░░░░░░░░░░░"));
    }

    #[test]
    fn nested_boxes() {
        let mut s = Surface::new(10, 5);
        
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┌"},{"x":1,"y":0,"ch":"─"},{"x":2,"y":0,"ch":"─"},{"x":3,"y":0,"ch":"─"},{"x":4,"y":0,"ch":"─"},{"x":5,"y":0,"ch":"─"},{"x":6,"y":0,"ch":"─"},{"x":7,"y":0,"ch":"─"},{"x":8,"y":0,"ch":"─"},{"x":9,"y":0,"ch":"┐"},
            {"x":0,"y":1,"ch":"│"},{"x":9,"y":1,"ch":"│"},
            {"x":0,"y":2,"ch":"│"},{"x":9,"y":2,"ch":"│"},
            {"x":0,"y":3,"ch":"│"},{"x":9,"y":3,"ch":"│"},
            {"x":0,"y":4,"ch":"└"},{"x":1,"y":4,"ch":"─"},{"x":2,"y":4,"ch":"─"},{"x":3,"y":4,"ch":"─"},{"x":4,"y":4,"ch":"─"},{"x":5,"y":4,"ch":"─"},{"x":6,"y":4,"ch":"─"},{"x":7,"y":4,"ch":"─"},{"x":8,"y":4,"ch":"─"},{"x":9,"y":4,"ch":"┘"}
        ]"#);
        
        apply(&mut s, r#"[
            {"x":2,"y":1,"ch":"╭","fg":"cyan"},{"x":3,"y":1,"ch":"─","fg":"cyan"},{"x":4,"y":1,"ch":"─","fg":"cyan"},{"x":5,"y":1,"ch":"─","fg":"cyan"},{"x":6,"y":1,"ch":"─","fg":"cyan"},{"x":7,"y":1,"ch":"╮","fg":"cyan"},
            {"x":2,"y":2,"ch":"│","fg":"cyan"},{"x":4,"y":2,"ch":"H"},{"x":5,"y":2,"ch":"i"},{"x":7,"y":2,"ch":"│","fg":"cyan"},
            {"x":2,"y":3,"ch":"╰","fg":"cyan"},{"x":3,"y":3,"ch":"─","fg":"cyan"},{"x":4,"y":3,"ch":"─","fg":"cyan"},{"x":5,"y":3,"ch":"─","fg":"cyan"},{"x":6,"y":3,"ch":"─","fg":"cyan"},{"x":7,"y":3,"ch":"╯","fg":"cyan"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("┌────────┐"));
        assert!(text.contains("╭────╮"));
        assert!(text.contains("Hi"));
        assert!(text.contains("╰────╯"));
        assert!(text.contains("└────────┘"));
    }

    #[test]
    fn text_with_cjk() {
        let mut s = Surface::new(10, 1);
        s.write_str(0, 0, "A一B", Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let text = s.to_text();
        assert!(text.starts_with("A一B"));
        let snap = s.snapshot();
        assert!(!snap[0][0].4); 
        assert!(!snap[0][1].4); 
        assert!(snap[0][2].4);  
        assert!(!snap[0][3].4); 
    }

    #[test]
    fn text_with_emoji() {
        let mut s = Surface::new(10, 1);
        s.write_str(0, 0, "🚀Go", Col::GREEN, Col::DEFAULT, Style::BOLD);
        let text = s.to_text();
        assert!(text.starts_with("🚀Go"));
        let snap = s.snapshot();
        assert_eq!(snap[0][0].0, '🚀');
        assert!(snap[0][1].4); 
        assert_eq!(snap[0][2].0, 'G');
        assert_eq!(snap[0][3].0, 'o');
    }

    #[test]
    fn markdown_table_box_drawing() {
        let mut s = Surface::new(20, 5);
        
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"┌"},{"x":1,"y":0,"ch":"─"},{"x":2,"y":0,"ch":"─"},{"x":3,"y":0,"ch":"─"},{"x":4,"y":0,"ch":"┬"},{"x":5,"y":0,"ch":"─"},{"x":6,"y":0,"ch":"─"},{"x":7,"y":0,"ch":"─"},{"x":8,"y":0,"ch":"┐"},
            {"x":0,"y":1,"ch":"│"},{"x":2,"y":1,"ch":"A","style":"bold"},{"x":4,"y":1,"ch":"│"},{"x":6,"y":1,"ch":"B","style":"bold"},{"x":8,"y":1,"ch":"│"},
            {"x":0,"y":2,"ch":"├"},{"x":1,"y":2,"ch":"─"},{"x":2,"y":2,"ch":"─"},{"x":3,"y":2,"ch":"─"},{"x":4,"y":2,"ch":"┼"},{"x":5,"y":2,"ch":"─"},{"x":6,"y":2,"ch":"─"},{"x":7,"y":2,"ch":"─"},{"x":8,"y":2,"ch":"┤"},
            {"x":0,"y":3,"ch":"│"},{"x":2,"y":3,"ch":"1"},{"x":4,"y":3,"ch":"│"},{"x":6,"y":3,"ch":"2"},{"x":8,"y":3,"ch":"│"},
            {"x":0,"y":4,"ch":"└"},{"x":1,"y":4,"ch":"─"},{"x":2,"y":4,"ch":"─"},{"x":3,"y":4,"ch":"─"},{"x":4,"y":4,"ch":"┴"},{"x":5,"y":4,"ch":"─"},{"x":6,"y":4,"ch":"─"},{"x":7,"y":4,"ch":"─"},{"x":8,"y":4,"ch":"┘"}
        ]"#);
        let text = s.to_text();
        assert!(text.contains("┌───┬───┐"));
        assert!(text.contains("├───┼───┤"));
        assert!(text.contains("└───┴───┘"));
        let snap = s.snapshot();
        assert_eq!(snap[1][2].3, Style::BOLD); 
    }

    #[test]
    fn ansi_parser_renders_colored_text() {
        let mut p = crate::core::ansi_parser::AnsiParser::new(20, 1);
        p.feed(b"\x1b[1;31mError\x1b[0m: not found");
        let text = p.to_text();
        assert!(text.contains("Error"));
        assert!(text.contains("not found"));
        assert_eq!(p.cell(0, 0).fg, Col::RED);
        assert_eq!(p.cell(0, 0).style, Style::BOLD);
        assert!(p.cell(7, 0).fg.is_default());
    }

    #[test]
    fn ansi_parser_renders_progress_bar() {
        let mut p = crate::core::ansi_parser::AnsiParser::new(30, 1);
        p.feed(b"\x1b[32m\xe2\x96\x88\xe2\x96\x88\xe2\x96\x88\xe2\x96\x88\xe2\x96\x88\x1b[90m\xe2\x96\x91\xe2\x96\x91\xe2\x96\x91\xe2\x96\x91\xe2\x96\x91\x1b[0m");
        let text = p.to_text();
        assert!(text.contains("█"));
        assert!(text.contains("░"));
        assert_eq!(p.cell(0, 0).fg, Col::GREEN);
    }

    #[test]
    fn flush_trace_contains_all_sgr_for_styled_text() {
        let mut s = Surface::new(3, 1);
        let ansi = s.flush_to_string(); 
        s.set(0, 0, 'A', Col::RED, Col::BLUE, Style::BOLD | Style::ITALIC);
        s.set(1, 0, 'B', Col::GREEN, Col::DEFAULT, Style::UNDERLINE);
        s.set(2, 0, 'C', Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let ansi = s.flush_to_string();
        
        assert!(ansi.contains(";1"), "missing bold SGR");
        assert!(ansi.contains(";3"), "missing italic SGR");
        assert!(ansi.contains(";31"), "missing red fg");
        assert!(ansi.contains(";44"), "missing blue bg");
        
        assert!(ansi.contains(";4"), "missing underline SGR");
        assert!(ansi.contains(";32"), "missing green fg");
        
        assert!(ansi.contains('A'));
        assert!(ansi.contains('B'));
        assert!(ansi.contains('C'));
    }

    #[test]
    fn flush_trace_diff_only_on_partial_update() {
        let mut s = Surface::new(5, 1);
        s.write_str(0, 0, "ABCDE", Col::DEFAULT, Col::DEFAULT, Style::NONE);
        let _ = s.flush_to_string(); 
        
        s.set(2, 0, 'X', Col::RED, Col::DEFAULT, Style::BOLD);
        let ansi = s.flush_to_string();
        
        assert!(ansi.contains("\x1b[1;3H"), "missing position for changed cell");
        assert!(ansi.contains('X'), "missing updated char");
        
        assert!(!ansi.contains("\x1b[1;1H"), "should not re-render unchanged cell 0");
        assert!(!ansi.contains("\x1b[1;5H"), "should not re-render unchanged cell 4");
    }

    #[test]
    fn flush_trace_rgb_encoding() {
        let mut s = Surface::new(1, 1);
        let _ = s.flush_to_string();
        s.set(0, 0, 'X', Col::rgb(100, 200, 50), Col::rgb(10, 20, 30), Style::NONE);
        let ansi = s.flush_to_string();
        assert!(ansi.contains(";38;2;100;200;50"), "missing RGB fg");
        assert!(ansi.contains(";48;2;10;20;30"), "missing RGB bg");
    }

    #[test]
    fn debug_view_shows_all_cell_info() {
        let mut s = Surface::new(3, 1);
        s.set(0, 0, 'A', Col::RED, Col::BLUE, Style::BOLD);
        s.set(1, 0, '\u{4E00}', Col::GREEN, Col::DEFAULT, Style::NONE);
        
        let dbg = s.to_debug();
        assert!(dbg.contains("A[n1/n4:B]"), "A should be red/blue/bold: {}", dbg);
        assert!(dbg.contains("一[n2/-]"), "一 should be green/default: {}", dbg);
        assert!(dbg.contains(">>"), "cont cell should show >>: {}", dbg);
    }

    #[test]
    fn single_cell_surface() {
        let mut s = Surface::new(1, 1);
        apply(&mut s, r#"[{"x":0,"y":0,"ch":"X","fg":"red","style":"bold"}]"#);
        let text = s.to_text();
        assert_eq!(text, "X");
        let snap = s.snapshot();
        assert_eq!(snap[0][0].1, Col::RED);
        assert_eq!(snap[0][0].3, Style::BOLD);
    }

    #[test]
    fn out_of_bounds_cells_ignored() {
        let mut s = Surface::new(3, 3);
        apply(&mut s, r#"[
            {"x":0,"y":0,"ch":"A"},
            {"x":100,"y":100,"ch":"Z"},
            {"x":2,"y":2,"ch":"B"}
        ]"#);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].0, 'A');
        assert_eq!(snap[2][2].0, 'B');
    }

    #[test]
    fn empty_cell_update() {
        let mut s = Surface::new(5, 1);
        apply(&mut s, "[]");
        let text = s.to_text();
        assert_eq!(text.trim(), "");
    }

    #[test]
    fn overwrite_cell() {
        let mut s = Surface::new(5, 1);
        apply(&mut s, r#"[{"x":0,"y":0,"ch":"A","fg":"red"}]"#);
        apply(&mut s, r#"[{"x":0,"y":0,"ch":"B","fg":"green"}]"#);
        let snap = s.snapshot();
        assert_eq!(snap[0][0].0, 'B');
        assert_eq!(snap[0][0].1, Col::GREEN);
    }

    #[test]
    fn combined_styles() {
        let mut s = Surface::new(1, 1);
        apply(&mut s, r#"[{"x":0,"y":0,"ch":"X","style":"bold,italic,underline,reverse"}]"#);
        let snap = s.snapshot();
        let st = snap[0][0].3;
        assert!(st.contains(Style::BOLD));
        assert!(st.contains(Style::ITALIC));
        assert!(st.contains(Style::UNDERLINE));
        assert!(st.contains(Style::REVERSE));
    }

    #[test]
    fn style_as_numeric_bits() {
        let mut s = Surface::new(1, 1);
        
        apply(&mut s, r#"[{"x":0,"y":0,"ch":"X","style":5}]"#);
        let snap = s.snapshot();
        assert!(snap[0][0].3.contains(Style::BOLD));
        assert!(snap[0][0].3.contains(Style::ITALIC));
    }

    #[test]
    fn all_named_colors() {
        let colors = [
            ("black", Col::BLACK), ("red", Col::RED), ("green", Col::GREEN),
            ("yellow", Col::YELLOW), ("blue", Col::BLUE), ("magenta", Col::MAGENTA),
            ("cyan", Col::CYAN), ("white", Col::WHITE),
            ("brightBlack", Col::BRIGHT_BLACK), ("brightRed", Col::BRIGHT_RED),
            ("brightGreen", Col::BRIGHT_GREEN), ("brightYellow", Col::BRIGHT_YELLOW),
            ("brightBlue", Col::BRIGHT_BLUE), ("brightMagenta", Col::BRIGHT_MAGENTA),
            ("brightCyan", Col::BRIGHT_CYAN), ("brightWhite", Col::BRIGHT_WHITE),
        ];
        for (name, expected) in &colors {
            let mut s = Surface::new(1, 1);
            apply(&mut s, &format!(r#"[{{"x":0,"y":0,"ch":"X","fg":"{}"}}]"#, name));
            let snap = s.snapshot();
            assert_eq!(snap[0][0].1, *expected, "color '{}' mismatch", name);
        }
    }

    #[test]
    fn tokenizer_bridge_rust_language() {
        let reg = crate::highlight::registry::LanguageRegistry::new();
        let h = reg.for_name("rust").unwrap();
        let cache = crate::highlight::registry::FileTokenCache::tokenize_file(h, "fn main() {}");
        let tokens = cache.get_tokens(0);
        assert!(!tokens.is_empty());
        assert!(tokens.iter().any(|t| t.kind == crate::highlight::token::TokenKind::Keyword));
    }

    #[test]
    fn tokenizer_bridge_javascript() {
        let reg = crate::highlight::registry::LanguageRegistry::new();
        let h = reg.for_name("javascript").unwrap();
        let cache = crate::highlight::registry::FileTokenCache::tokenize_file(h, "const x = 42;");
        let tokens = cache.get_tokens(0);
        assert!(tokens.iter().any(|t| t.kind == crate::highlight::token::TokenKind::Keyword));
        assert!(tokens.iter().any(|t| t.kind == crate::highlight::token::TokenKind::Number));
    }

    #[test]
    fn tokenizer_produces_json() {
        let reg = crate::highlight::registry::LanguageRegistry::new();
        let h = reg.for_name("rust").unwrap();
        let cache = crate::highlight::registry::FileTokenCache::tokenize_file(h, "let x = 42;");
        let mut result = Vec::new();
        for line_idx in 0..cache.line_count() {
            let tokens = cache.get_tokens(line_idx);
            let line_tokens: Vec<serde_json::Value> = tokens.iter().map(|t| {
                serde_json::json!({
                    "start": t.start,
                    "length": t.length,
                    "kind": format!("{:?}", t.kind),
                })
            }).collect();
            result.push(serde_json::Value::Array(line_tokens));
        }
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("Keyword"));
        assert!(json.contains("Number"));
    }
}
