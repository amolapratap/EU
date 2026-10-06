import os
import fitz  # PyMuPDF
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
)
from reportlab.graphics.shapes import Drawing, Line, Polygon, Circle
from reportlab.pdfgen import canvas

class UniversityExamCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw authentic university footers.
    """
    def __init__(self, *args, **kwargs):
        super(UniversityExamCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(UniversityExamCanvas, self).showPage()
        super(UniversityExamCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Times-Bold", 10.5)
        page_num = self._pageNumber
        width, height = A4

        # Page X of Y footer centered at bottom
        text = f"Page {page_num} of {page_count}"
        self.drawCentredString(width / 2.0, 24, text)
        self.restoreState()


def create_divider_ornament(width=240, height=14):
    """
    Creates an authentic crisp vector ornament matching Indian university examination papers.
    """
    d = Drawing(width, height)
    mid_y = height / 2.0
    center_x = width / 2.0

    # Left horizontal line
    d.add(Line(0, mid_y, center_x - 18, mid_y, strokeColor=colors.HexColor('#222222'), strokeWidth=0.9))
    # Left dot
    d.add(Circle(center_x - 13, mid_y, 2.2, fillColor=colors.HexColor('#222222'), strokeColor=colors.HexColor('#222222')))
    # Center diamond
    d.add(Polygon([
        center_x, mid_y + 4.2,
        center_x + 4.6, mid_y,
        center_x, mid_y - 4.2,
        center_x - 4.6, mid_y
    ], fillColor=colors.HexColor('#222222'), strokeColor=colors.HexColor('#222222')))
    # Right dot
    d.add(Circle(center_x + 13, mid_y, 2.2, fillColor=colors.HexColor('#222222'), strokeColor=colors.HexColor('#222222')))
    # Right horizontal line
    d.add(Line(center_x + 18, mid_y, width, mid_y, strokeColor=colors.HexColor('#222222'), strokeWidth=0.9))
    return d


def generate_exam_paper(output_path="Bihar_Engineering_University_Electrical_Drives_2024.pdf"):
    # Page setup: A4 with 32pt margins
    # Printable width: 595.27 - 64 = 531.27 pt
    # Printable height: 841.89 - 60 = 781.89 pt
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=32,
        rightMargin=32,
        topMargin=26,
        bottomMargin=36
    )

    # Styles definition matching authentic Bihar Engineering University exam paper
    univ_title_style = ParagraphStyle(
        'UnivTitle',
        fontName='Times-Bold',
        fontSize=14.5,
        leading=18,
        alignment=1, # Center
        spaceAfter=1
    )

    exam_title_style = ParagraphStyle(
        'ExamTitle',
        fontName='Times-Bold',
        fontSize=12,
        leading=15,
        alignment=1, # Center
        spaceAfter=5
    )

    meta_left_style = ParagraphStyle(
        'MetaLeft',
        fontName='Times-BoldItalic',
        fontSize=10,
        leading=13.5,
        alignment=0
    )

    meta_center_style = ParagraphStyle(
        'MetaCenter',
        fontName='Times-BoldItalic',
        fontSize=10,
        leading=13.5,
        alignment=1
    )

    meta_right_style = ParagraphStyle(
        'MetaRight',
        fontName='Times-BoldItalic',
        fontSize=10,
        leading=13.5,
        alignment=2
    )

    inst_heading_style = ParagraphStyle(
        'InstHeading',
        fontName='Times-BoldItalic',
        fontSize=9.5,
        leading=12,
        spaceAfter=1
    )

    inst_item_style = ParagraphStyle(
        'InstItem',
        fontName='Times-Italic',
        fontSize=9,
        leading=12
    )

    q1_hdr_label = ParagraphStyle(
        'Q1HdrLabel',
        fontName='Times-BoldItalic',
        fontSize=10,
        leading=13.5
    )

    q1_hdr_text = ParagraphStyle(
        'Q1HdrText',
        fontName='Times-BoldItalic',
        fontSize=10,
        leading=13.5
    )

    q1_hdr_marks = ParagraphStyle(
        'Q1HdrMarks',
        fontName='Times-Bold',
        fontSize=10,
        leading=13.5,
        alignment=2
    )

    mcq_num_style = ParagraphStyle(
        'MCQNum',
        fontName='Times-Roman',
        fontSize=9.8,
        leading=13,
        alignment=0
    )

    mcq_text_style = ParagraphStyle(
        'MCQText',
        fontName='Times-Roman',
        fontSize=9.8,
        leading=13
    )

    mcq_opt_style = ParagraphStyle(
        'MCQOpt',
        fontName='Times-Roman',
        fontSize=9.2,
        leading=12.2
    )

    lq_num_style = ParagraphStyle(
        'LQNum',
        fontName='Times-BoldItalic',
        fontSize=10,
        leading=13.2,
        alignment=0
    )

    lq_part_style = ParagraphStyle(
        'LQPart',
        fontName='Times-Roman',
        fontSize=9.8,
        leading=13,
        alignment=0
    )

    lq_body_style = ParagraphStyle(
        'LQBody',
        fontName='Times-Roman',
        fontSize=9.6,
        leading=12.8
    )

    lq_marks_style = ParagraphStyle(
        'LQMarks',
        fontName='Times-Bold',
        fontSize=10,
        leading=13,
        alignment=2
    )

    story = []

    # ==================== PAGE 1 HEADER ====================
    story.append(Paragraph("Bihar Engineering University, Patna", univ_title_style))
    story.append(Paragraph("B.Tech 6<sup>th</sup> Semester Examination, 2024", exam_title_style))

    # Meta Table (Course, Subject, Time, Code, Full Marks)
    meta_table_data = [
        [
            Paragraph("Course : B.Tech", meta_left_style),
            Paragraph("Subject: Electrical Drives", meta_center_style),
            Paragraph("Time: 03 Hours", meta_right_style)
        ],
        [
            Paragraph("Code : 100613", meta_left_style),
            Paragraph("", meta_center_style),
            Paragraph("Full Marks: 70", meta_right_style)
        ]
    ]
    meta_table = Table(meta_table_data, colWidths=[125, 281, 125])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
    ]))
    story.append(meta_table)

    story.append(Spacer(1, 3))
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.black, spaceBefore=0, spaceAfter=3))

    # Instructions
    story.append(Paragraph("Instructions:-", inst_heading_style))
    instructions = [
        "(i) The marks are indicated in the right-hand margin.",
        "(ii) There are <b>NINE</b> questions in this paper.",
        "(iii) Attempt <b>FIVE</b> questions in all.",
        "(iv) Question No. <b>1</b> is compulsory."
    ]
    for inst in instructions:
        story.append(Paragraph(inst, inst_item_style))

    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.black, spaceBefore=3, spaceAfter=5))

    # Q.1 Header Row
    q1_hdr_data = [
        [
            Paragraph("Q.1", q1_hdr_label),
            Paragraph("Choose the correct answer the following (Any seven question only):", q1_hdr_text),
            Paragraph("[2 x 7 = 14]", q1_hdr_marks)
        ]
    ]
    q1_hdr_table = Table(q1_hdr_data, colWidths=[24, 432, 75])
    q1_hdr_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(q1_hdr_table)

    # Page 1 MCQs: (a) through (i)
    page1_mcqs = [
        {
            "id": "(a)",
            "q": "The consideration involved in the selection of the type of electric drive for a particular application depends upon",
            "opts": [
                ("(i)", "Speed control range and its nature", "(iii)", "Starting Nature"),
                ("(ii)", "Environmental condition", "(iv)", "All of the above")
            ]
        },
        {
            "id": "(b)",
            "q": "The consideration involved in the selection of the type of electric drive for the Load Variation application depends upon",
            "opts": [
                ("(i)", "Constant Load", "(iii)", "Pulsating Load"),
                ("(ii)", "Continuous Variable Load", "(iv)", "All of the above")
            ]
        },
        {
            "id": "(c)",
            "q": "Which type of drive can be used for Minning Process?",
            "opts": [
                ("(i)", "DC Motor with Ward Leonard Speed control", "(iii)", "Slip Ring Induction Motor"),
                ("(ii)", "Double Squirrel cage Induction Motor", "(iv)", "All of the above")
            ]
        },
        {
            "id": "(d)",
            "q": "For an application which requires smooth and precise speed control over the wide range, the motor is preferred is",
            "opts": [
                ("(i)", "Squirrel cage Induction Motor", "(iii)", "DC motor"),
                ("(ii)", "Synchronous Motor", "(iv)", "Wound Rotor Induction Motor")
            ]
        },
        {
            "id": "(e)",
            "q": "If the current in the armature of d.c series motor is reduced to 5%, the torque of the motor will become:",
            "opts": [
                ("(i)", "50% of the Previous Value", "(iii)", "150% of the Previous Value"),
                ("(ii)", "25% of the Previous Value", "(iv)", "100% of the Previous Value")
            ]
        },
        {
            "id": "(f)",
            "q": "In case of a 3 phase induction motor, plugging is done by:",
            "opts": [
                ("(i)", "Starting the motor on load which is more than the rated load", "(iii)", "Interchanging connections of any two phases of the stator for quick stopping"),
                ("(ii)", "Pulling the motor directly on line without a starter", "(iv)", "Locking of the rotor due to harmonics")
            ]
        },
        {
            "id": "(g)",
            "q": "Which type of Motor is best suited for the excavator?",
            "opts": [
                ("(i)", "DC Shunt Motor", "(iii)", "DC series Motor"),
                ("(ii)", "Differential Motor", "(iv)", "DC series Motor")
            ]
        },
        {
            "id": "(h)",
            "q": "Belt conveyors offer",
            "opts": [
                ("(i)", "Zero starting torque", "(iii)", "Medium starting torque"),
                ("(ii)", "Low starting torque", "(iv)", "High starting torque")
            ]
        },
        {
            "id": "(i)",
            "q": "The traveling speed of the crane varies from",
            "opts": [
                ("(i)", "1 to 2.5 m/s", "(iii)", "10 to 20 m/s"),
                ("(ii)", "5 to 10 m/s", "(iv)", "25 to 40 m/s")
            ]
        }
    ]

    for item in page1_mcqs:
        opt_rows = []
        for r in item["opts"]:
            opt_rows.append([
                Paragraph(f"{r[0]}&nbsp;&nbsp;{r[1]}", mcq_opt_style),
                Paragraph(f"{r[2]}&nbsp;&nbsp;{r[3]}", mcq_opt_style)
            ])
        opt_table = Table(opt_rows, colWidths=[255, 254])
        opt_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 16),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 1.2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1.2),
        ]))

        q_table = Table([
            [Paragraph(item["id"], mcq_num_style), Paragraph(item["q"], mcq_text_style)],
            ['', opt_table]
        ], colWidths=[22, 509])
        q_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
        ]))
        story.append(q_table)
        story.append(Spacer(1, 9.5))

    # Page Break to Page 2
    story.append(PageBreak())

    # ==================== PAGE 2 ====================
    # Item (j) at top of Page 2
    item_j = {
        "id": "(j)",
        "q": "Regenerative braking mode can be achieved in which quadrant (V-I curve)?",
        "opts": [
            ("(i)", "Third", "(iii)", "Fourth"),
            ("(ii)", "Second", "(iv)", "First")
        ]
    }
    opt_rows_j = []
    for r in item_j["opts"]:
        opt_rows_j.append([
            Paragraph(f"{r[0]}&nbsp;&nbsp;{r[1]}", mcq_opt_style),
            Paragraph(f"{r[2]}&nbsp;&nbsp;{r[3]}", mcq_opt_style)
        ])
    opt_table_j = Table(opt_rows_j, colWidths=[255, 254])
    opt_table_j.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 16),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 1.2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.2),
    ]))
    q_table_j = Table([
        [Paragraph(item_j["id"], mcq_num_style), Paragraph(item_j["q"], mcq_text_style)],
        ['', opt_table_j]
    ], colWidths=[22, 509])
    q_table_j.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(q_table_j)
    story.append(Spacer(1, 12))

    # Long Questions: Q.2 to Q.9
    long_questions = [
        {
            "num": "Q.2",
            "parts": [
                ("(a)", "Draw the schematic representation and equivalent circuit of a DC machine and derive the expression for induced emf and electromagnetic torque.", "[7]"),
                ("(b)", "A 220 V, 500 A, 600 rpm separately excited motor has armature and field resistance of 0.02 and 10 ohm respectively. The load torque is given by the expression T<sub>L</sub> = 2000 - 2N, N-m, where N is the speed in rpm. Speeds below the rated are obtained by armature voltage control and depends above the rated are obtained by field control.<br/>i)&nbsp;&nbsp;Calculate motor terminal voltage and armature current when the speed is 450 rpm.<br/>ii)&nbsp;Calculate field winding voltage and armature current when the speed is 750 rpm. Assume the rated field voltage is the same as the rated armature voltage", "[7]")
            ]
        },
        {
            "num": "Q.3",
            "parts": [
                ("(a)", "Draw the diagram and Derive the transfer function of a self excited DC motor load converter system Draw the diagram and Derive the transfer function of a self excited DC motor load converter system", "[7]"),
                ("(b)", "Illustrate the use of inner current loop in closed loop speed control.", "[7]")
            ]
        },
        {
            "num": "Q.4",
            "parts": [
                ("(a)", "Explain with neat sketch the chopper control method of speed control of DC Motors.", "[7]"),
                ("(b)", "When varying speed by field flux control, flux must be varied in small steps only. Why?", "[7]")
            ]
        },
        {
            "num": "Q.5",
            "parts": [
                ("(a)", "A 220 V, 24 A, 100 rpm, separately excited DC motor has an armature resistance of 2 ohm. Motor is controlled by chopper with frequency of 500 Hz and source voltage of 230 V. Calculate the duty ratio for 1.2 times rated torque and 500 rpm", "[7]"),
                ("(b)", "Explain Why a DC series motor is more suitable to deal with torque over loads than other DC motor?", "[7]")
            ]
        },
        {
            "num": "Q.6",
            "parts": [
                ("(a)", "Account on voltage source inverter fed induction motor drives along with its limitations.", "[7]"),
                ("(b)", "A three phase star connected, 50Hz, 4pole induction motor has the following parameters in ohms per phase referred to the stator. R<sub>s</sub>=R<sub>r</sub>'=0.034 and X<sub>s</sub>=X<sub>r</sub>'=0.18. If the rated slip is 4%, then determine the motor speed for rated torque and f=25Hz. The motor I controlled with a constant V/f ratio.", "[7]")
            ]
        },
        {
            "num": "Q.7",
            "parts": [
                ("(a)", "Draw the speed torque and speed current characteristics for fixed V/f ratio of an induction motor by explaining the operation of V/f control.", "[7]"),
                ("(b)", "With help of block diagram, explain the closed loop operation of slipped control PWM inverter drive with dynamic breaking.", "[7]")
            ]
        },
        {
            "num": "Q.8",
            "parts": [
                ("(a)", "What is slip power recovery scheme and describe Scherbius static drive in detail?", "[7]"),
                ("(b)", "Explain the different methods of speed control used in three phase induction motors.", "[7]")
            ]
        },
        {
            "num": "Q.9",
            "parts": [
                ("(a)", "Explain the operating principle of vector-controlled induction motor drives.", "[7]"),
                ("(b)", "Draw the power circuit arrangement of three phase variable frequency inverter for the speed control of three phase induction motor and explain its working", "[7]")
            ]
        }
    ]

    for q in long_questions:
        q_rows = []
        for idx, p in enumerate(q["parts"]):
            col_num = Paragraph(f"<b><i>{q['num']}</i></b>", lq_num_style) if idx == 0 else Paragraph("", lq_num_style)
            col_part = Paragraph(p[0], lq_part_style)
            col_body = Paragraph(p[1], lq_body_style)
            col_marks = Paragraph(p[2], lq_marks_style)
            q_rows.append([col_num, col_part, col_body, col_marks])

        t = Table(q_rows, colWidths=[24, 18, 459, 30])
        t.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ]))
        story.append(t)
        story.append(Spacer(1, 11))

    # Bottom Ornament (Centered vector line with diamond and dots)
    ornament_drawing = create_divider_ornament(width=240, height=14)
    orn_table = Table([[ornament_drawing]], colWidths=[531])
    orn_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(orn_table)

    doc.build(story, canvasmaker=UniversityExamCanvas)
    print(f"Successfully generated: {output_path}")

if __name__ == "__main__":
    generate_exam_paper()
