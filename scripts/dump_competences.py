import openpyxl

wb = openpyxl.load_workbook('docs/tableau_competences.xlsx')
ws = wb.active

for r in range(1, 40):
    row = [ws.cell(row=r, column=c).value for c in range(1, 30)]
    non = [(c+1, v) for c, v in enumerate(row) if v not in (None, "")]
    if non:
        print(f"Row {r}: {non}")
