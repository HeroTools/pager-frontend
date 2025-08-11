export const StaticToolbar = () => {
  return (
    <>
      <div className="ql-toolbar ql-snow">
        <span className="ql-formats">
          <button className="ql-bold" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                d="M5,4H9.5A2.5,2.5,0,0,1,12,6.5v0A2.5,2.5,0,0,1,9.5,9H5A0,0,0,0,1,5,9V4A0,0,0,0,1,5,4Z"
              ></path>
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                d="M5,9h5.5A2.5,2.5,0,0,1,13,11.5v0A2.5,2.5,0,0,1,10.5,14H5a0,0,0,0,1,0,0V9A0,0,0,0,1,5,9Z"
              ></path>
            </svg>
          </button>
          <button className="ql-italic" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="13"
                y1="4"
                y2="4"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="5"
                x2="11"
                y1="14"
                y2="14"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="8"
                x2="10"
                y1="14"
                y2="4"
              ></line>
            </svg>
          </button>
          <button className="ql-underline" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                d="M5,3V9a4.012,4.012,0,0,0,4,4H9a4.012,4.012,0,0,0,4-4V3"
              ></path>
              <rect
                className="ql-fill"
                fill="currentColor"
                height="1"
                width="12"
                x="3"
                y="15"
              ></rect>
            </svg>
          </button>
          <button className="ql-strike" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="15"
                x2="3"
                y1="9"
                y2="9"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="9"
                x2="5"
                y1="4"
                y2="4"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="9"
                x2="13"
                y1="14"
                y2="14"
              ></line>
            </svg>
          </button>
        </span>
        <span className="ql-formats">
          <button className="ql-blockquote" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <rect className="ql-fill" fill="currentColor" height="3" width="3" x="4" y="5"></rect>
              <rect
                className="ql-fill"
                fill="currentColor"
                height="3"
                width="3"
                x="11"
                y="5"
              ></rect>
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="1"
                d="M7,8c0,4.031-3,5-3,5"
              ></path>
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="1"
                d="M14,8c0,4.031-3,5-3,5"
              ></path>
            </svg>
          </button>
          <button className="ql-code-block" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <polyline
                className="ql-even ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                points="5 7 3 9 5 11"
              ></polyline>
              <polyline
                className="ql-even ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                points="13 7 15 9 13 11"
              ></polyline>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="10"
                x2="8"
                y1="5"
                y2="13"
              ></line>
            </svg>
          </button>
        </span>
        <span className="ql-formats">
          <button value="1" className="ql-list" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="15"
                y1="4"
                y2="4"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="15"
                y1="9"
                y2="9"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="15"
                y1="14"
                y2="14"
              ></line>
              <line
                className="ql-stroke ql-thin"
                stroke="currentColor"
                strokeWidth="1"
                x1="2.5"
                x2="4.5"
                y1="5.5"
                y2="5.5"
              ></line>
              <path
                className="ql-fill"
                fill="currentColor"
                d="M3.5,6A0.5,0.5,0,0,1,3,5.5V3.085l-0.276,0.138A0.5,0.5,0,0,1,2.053,3c-0.124-0.247-0.023-0.547,0.224-0.671l1-0.5A0.5,0.5,0,0,1,4,2.5v3A0.5,0.5,0,0,1,3.5,6Z"
              ></path>
              <path
                className="ql-stroke ql-thin"
                stroke="currentColor"
                d="M4.5,10.5h-2c0-0.828,1.121-1.5,2.5-1.5s2.5,0.672,2.5,1.5h0"
              ></path>
              <path className="ql-stroke ql-thin" stroke="currentColor" d="M2.5,10.5h5"></path>
              <path
                className="ql-fill"
                fill="currentColor"
                d="M3.5,11.5a0.5,0.5,0,0,1,0-1h1a0.5,0.5,0,0,1,0,1h-1Z"
              ></path>
              <path
                className="ql-stroke ql-thin"
                stroke="currentColor"
                d="M4.5,14.5h-2s1.121-1.5,2.5-1.5,2.5,0.672,2.5,1.5h0"
              ></path>
              <path className="ql-stroke ql-thin" stroke="currentColor" d="M2.5,14.5h5"></path>
              <path
                className="ql-fill"
                fill="currentColor"
                d="M5.5,15.5a0.5,0.5,0,0,1,0-1h1a0.5,0.5,0,0,1,0,1h-1Z"
              ></path>
            </svg>
          </button>
          <button value="2" className="ql-list" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="15"
                y1="4"
                y2="4"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="15"
                y1="9"
                y2="9"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="15"
                y1="14"
                y2="14"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="4.1"
                x2="4.1"
                y1="6.1"
                y2="3.9"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="3"
                x2="5"
                y1="5"
                y2="5"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="4.1"
                x2="4.1"
                y1="11.1"
                y2="8.9"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="3"
                x2="5"
                y1="10"
                y2="10"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="4.1"
                x2="4.1"
                y1="16.1"
                y2="13.9"
              ></line>
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="3"
                x2="5"
                y1="15"
                y2="15"
              ></line>
            </svg>
          </button>
        </span>
        <span className="ql-formats">
          <button className="ql-link" type="button">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18">
              <line
                className="ql-stroke"
                stroke="currentColor"
                strokeWidth="2"
                x1="7"
                x2="11"
                y1="7"
                y2="11"
              ></line>
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                d="M8.9,4.577a3.476,3.476,0,0,1,0,4.848L7.965,10.36A3.476,3.476,0,0,1,3.117,5.512L4.4,4.226"
              ></path>
              <path
                className="ql-stroke"
                stroke="currentColor"
                fill="none"
                strokeWidth="2"
                d="M9.083,13.423a3.476,3.476,0,0,1,0-4.848l0.935-0.935a3.476,3.476,0,0,1,4.848,4.848L13.6,13.774"
              ></path>
            </svg>
          </button>
        </span>
      </div>
      <div className="ql-container ql-snow">
        <div className="ql-editor ql-blank" data-placeholder="Write something...">
          <p>
            <br />
          </p>
        </div>
      </div>
    </>
  );
};
