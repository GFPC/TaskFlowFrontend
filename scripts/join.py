import os


def list_files(folder: str, ext: tuple, recursive: bool = False) -> list:
    path = os.path.join(cwd, folder)
    ret = []
    for i in os.listdir(path):
        if i == '__pycache__':
            continue
        fp = os.path.join(path, i)
        if os.path.isfile(fp):
            if i.split('.')[-1] in ext:
                ret.append(fp)
        elif recursive:
            ret += list_files(fp, ext, True)
    return ret


cwd = os.path.dirname(os.path.dirname(__file__)) or os.getcwd()
file_list = (
    list_files('lib', ('ts', 'tsx'), True)
    + list_files('hooks', ('ts',), True)
    + list_files('components', ('ts', 'tsx'), True)
    + list_files('app', ('ts', 'tsx', 'css'), True)
)

out = open('joined.txt', 'w', encoding='utf-8')
out.write('TaskFlowFrontend:\n')
for fp in file_list:
    out.write(fp + '\n')
    out.write(open(fp, 'r', encoding='utf-8').read() + '\n')
out.close()
